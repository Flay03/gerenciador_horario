
import React, { createContext, useContext, useReducer, useEffect, useCallback, ReactNode, useRef } from 'react';
import { AppState, Action, GradeSlot, Bncc, PresenceUser, Turma, Alerta, Professor, Curso, Disciplina } from '../types';
import { validateState } from '../services/validationService';
import { db, auth } from '../firebaseConfig';
import { FIREBASE_ENABLED } from '../config';
import { LOCAL_STORAGE_KEY } from '../constants';
import * as firebase from 'firebase/compat/app'; // Import namespace for type access

const DataContext = createContext<{ state: AppState; dispatch: React.Dispatch<Action> } | undefined>(undefined);

const initialState: AppState = {
  version: "1.0",
  ano: new Date().getFullYear(),
  cursos: [],
  turmas: [],
  disciplinas: [],
  professores: [],
  atribuicoes: [],
  grade: [],
  alertas: [],
  bncc: [],
  toastMessage: null,
  draggedItem: null,
  clipboard: null,
  selectedSlotId: null,
  onlineUsers: [],
  saveStatus: 'saved',
  lastModifiedBy: null,
  lastModifiedAt: null,
};

// Undo/Redo state
let history: AppState[] = [initialState];
let historyIndex = 0;

// Helper function to parse slot IDs robustly
const parseSlotId = (id: string) => {
  const parts = id.split('_');
   if (parts.length < 3) {
      console.error('Invalid slot ID:', id);
      return { turmaId: '', dia: '', horario: '' };
    }
  const turmaId = parts[0] || '';
  const dia = parts[1] || '';
  let horario = parts.slice(2).join('_');

  // Sub-slot IDs use a hyphen at the end, which needs to be handled.
  const subSlotMatch = horario.match(/(.*)-([01])$/);
  if (subSlotMatch) {
      horario = subSlotMatch[1]; // The horario part
  }
  
  return { turmaId, dia, horario };
};

const sanitizeLoadedState = (loadedState: any): AppState => {
    const newState = { ...initialState, ...loadedState };

    // Sanitize primitives
    if (typeof newState.ano !== 'number' || isNaN(newState.ano)) {
        newState.ano = new Date().getFullYear();
    }

    // Ensure all major data arrays exist
    const arraysToSanitize: (keyof AppState)[] = ['cursos', 'turmas', 'disciplinas', 'professores', 'atribuicoes', 'grade', 'alertas', 'bncc'];
    arraysToSanitize.forEach(key => {
        if (!Array.isArray(newState[key])) {
            (newState as any)[key] = [];
        }
    });

    // --- Sanitize each entity array for shape and required fields ---
    
    newState.cursos = (newState.cursos as any[]).filter(c => c && typeof c.id === 'string' && typeof c.nome === 'string');
    
    newState.turmas = (newState.turmas as any[])
        .filter(t => t && typeof t.id === 'string' && typeof t.cursoId === 'string' && typeof t.nome === 'string' && typeof t.periodo === 'string')
        .map((t: any) => ({ ...t, isModular: !!t.isModular }));

    newState.disciplinas = (newState.disciplinas as any[]).filter(d => 
        d && typeof d.id === 'string' && typeof d.turmaId === 'string' && typeof d.nome === 'string' && typeof d.aulasSemanais === 'number'
    );

    newState.professores = (newState.professores as any[])
        .filter(p => p && typeof p.id === 'string' && typeof p.nome === 'string')
        .map(p => ({
            ...p,
            disponibilidade: (typeof p.disponibilidade === 'object' && p.disponibilidade !== null && !Array.isArray(p.disponibilidade))
                ? p.disponibilidade
                : {}
        }));

    newState.atribuicoes = (newState.atribuicoes as any[]).filter(a =>
        a && typeof a.disciplinaId === 'string' && Array.isArray(a.professores)
    );
    
    newState.grade = (newState.grade as any[]).filter(slot => {
        if (!slot || typeof slot !== 'object') return false;
        const requiredKeys: (keyof GradeSlot)[] = ['id', 'turmaId', 'dia', 'horario', 'disciplinaId', 'professorId'];
        return requiredKeys.every(key => typeof slot[key] === 'string' && slot[key]);
    });

    newState.bncc = (newState.bncc as any[]).filter(b => b && typeof b.id === 'string' && typeof b.nome === 'string');
    newState.alertas = []; // Alerts are always recalculated

    // --- Perform cross-reference sanitization to remove orphans ---

    const validCursoIds = new Set(newState.cursos.map(c => c.id));
    // Re-calculate validTurmaIds after potentially filtering turmas based on validCursoIds
    const validTurmaIds = new Set(newState.turmas.filter(t => validCursoIds.has(t.cursoId)).map(t => t.id));
    const validDisciplinaIds = new Set(newState.disciplinas.filter(d => validTurmaIds.has(d.turmaId)).map(d => d.id));
    const validProfessorIds = new Set(newState.professores.map(p => p.id));
    
    newState.turmas = newState.turmas.filter(t => {
        if (!validCursoIds.has(t.cursoId)) {
            console.warn(`Removing orphaned turma with invalid cursoId: ${t.cursoId}`, t);
            return false;
        }
        return true;
    });

    newState.disciplinas = newState.disciplinas.filter(d => {
        if(!validTurmaIds.has(d.turmaId)) {
            console.warn(`Removing orphaned disciplina with invalid turmaId: ${d.turmaId}`, d);
            return false;
        }
        return true;
    });

    newState.atribuicoes = newState.atribuicoes
        .filter(a => {
            if(!validDisciplinaIds.has(a.disciplinaId)) {
                console.warn(`Removing orphaned atribuicao with invalid disciplinaId: ${a.disciplinaId}`, a);
                return false;
            }
            return true;
        })
        .map(a => ({
            ...a,
            professores: a.professores.filter(pId => validProfessorIds.has(pId))
        }));

    newState.grade = newState.grade.filter(slot => {
        const isTurmaValid = validTurmaIds.has(slot.turmaId);
        const isDisciplinaValid = validDisciplinaIds.has(slot.disciplinaId);
        const isProfessorValid = validProfessorIds.has(slot.professorId);
        if (!isTurmaValid || !isDisciplinaValid || !isProfessorValid) {
            console.warn('Removing orphaned grade slot:', { slot, isTurmaValid, isDisciplinaValid, isProfessorValid });
            return false;
        }
        return true;
    });

    return newState;
};

// --- START: Efficient Firestore Update Logic ---
// This ref will hold a list of pending changes to be sent to Firestore.
const pendingChangesRef = { current: new Map<string, any>() };

const addChange = (field: keyof AppState, value: any) => {
    pendingChangesRef.current.set(field, value);
};

// Helper function to sanitize string inputs and prevent XSS.
const sanitizeString = (str: string | undefined): string => {
  if (!str) return '';
  // A simple sanitizer to remove HTML tags. Not as robust as DOMPurify, but prevents basic XSS.
  return str.replace(/<[^>]*>?/gm, '');
};


const dataReducer = (state: AppState, action: Action): AppState => {
  switch (action.type) {
    case 'SET_STATE':
      // This action is now handled in statefulReducer to include sanitization
      return state;
    case 'UPDATE_GRADE': {
      const { id, slot } = action.payload;
      const newGrade = state.grade.filter(s => s.id !== id);
      if (slot) {
        newGrade.push(slot);
      }
      addChange('grade', newGrade);
      return { ...state, grade: newGrade };
    }
    case 'POPULATE_GRADE': {
      addChange('grade', action.payload);
      return { ...state, grade: action.payload };
    }
    case 'DELETE_SLOT': {
        const { slotId } = action.payload;
        const slotExists = state.grade.some(s => s.id === slotId);
        if (!slotExists) return state; // Nothing to delete

        const newGrade = state.grade.filter(s => s.id !== slotId);
        addChange('grade', newGrade);
        return { ...state, grade: newGrade, selectedSlotId: null };
    }
    case 'SWAP_GRADE_SLOTS': {
        const { sourceId, destinationId } = action.payload;
        const sourceSlot = state.grade.find(s => s.id === sourceId);

        // If the source doesn't exist for some reason, do nothing.
        if (!sourceSlot) {
            return state;
        }

        const destSlot = state.grade.find(s => s.id === destinationId);
        const sourceInfo = parseSlotId(sourceId);
        const destInfo = parseSlotId(destinationId);

        // Create a new grade array without the source and destination slots
        const remainingGrade = state.grade.filter(s => s.id !== sourceId && s.id !== destinationId);

        // Create the new source slot at the destination's location
        const newSourceSlot = {
            ...sourceSlot,
            id: destinationId,
            turmaId: destInfo.turmaId,
            dia: destInfo.dia,
            horario: destInfo.horario
        };
        remainingGrade.push(newSourceSlot);

        // If there was a destination slot, create the new destination slot at the source's location
        if (destSlot) {
            const newDestSlot = {
                ...destSlot,
                id: sourceId,
                turmaId: sourceInfo.turmaId,
                dia: sourceInfo.dia,
                horario: sourceInfo.horario
            };
            remainingGrade.push(newDestSlot);
        }
        
        addChange('grade', remainingGrade);
        return { ...state, grade: remainingGrade };
    }
    // Cursos
    case 'ADD_CURSO': {
        const sanitizedPayload: Curso = { ...action.payload, nome: sanitizeString(action.payload.nome) };
        const newCursos = [...state.cursos, sanitizedPayload];
        addChange('cursos', newCursos);
        return { ...state, cursos: newCursos };
    }
    case 'UPDATE_CURSO': {
        const sanitizedPayload: Curso = { ...action.payload, nome: sanitizeString(action.payload.nome) };
        const newCursos = state.cursos.map(c => c.id === sanitizedPayload.id ? sanitizedPayload : c);
        addChange('cursos', newCursos);
        return { ...state, cursos: newCursos };
    }
    case 'DELETE_CURSO': {
        const turmasToDelete = state.turmas.filter(t => t.cursoId === action.payload.id).map(t => t.id);
        const disciplinasToDelete = state.disciplinas.filter(d => turmasToDelete.includes(d.turmaId)).map(d => d.id);
        
        const newCursos = state.cursos.filter(c => c.id !== action.payload.id);
        const newTurmas = state.turmas.filter(t => t.cursoId !== action.payload.id);
        const newDisciplinas = state.disciplinas.filter(d => !turmasToDelete.includes(d.turmaId));
        const newAtribuicoes = state.atribuicoes.filter(a => !disciplinasToDelete.includes(a.disciplinaId));
        const newGrade = state.grade.filter(g => !turmasToDelete.includes(g.turmaId));
        
        addChange('cursos', newCursos);
        addChange('turmas', newTurmas);
        addChange('disciplinas', newDisciplinas);
        addChange('atribuicoes', newAtribuicoes);
        addChange('grade', newGrade);

        return {
            ...state,
            cursos: newCursos,
            turmas: newTurmas,
            disciplinas: newDisciplinas,
            atribuicoes: newAtribuicoes,
            grade: newGrade,
        };
    }
    // Turmas
    case 'ADD_TURMA': {
        const sanitizedPayload: Turma = { ...action.payload, nome: sanitizeString(action.payload.nome) };
        const newTurmas = [...state.turmas, sanitizedPayload];
        addChange('turmas', newTurmas);
        return { ...state, turmas: newTurmas };
    }
    case 'UPDATE_TURMA': {
        const sanitizedPayload: Turma = { ...action.payload, nome: sanitizeString(action.payload.nome) };
        const newTurmas = state.turmas.map(t => t.id === sanitizedPayload.id ? sanitizedPayload : t);
        addChange('turmas', newTurmas);
        return { ...state, turmas: newTurmas };
    }
    case 'DELETE_TURMA': {
        const disciplinasToDelete = state.disciplinas.filter(d => d.turmaId === action.payload.id).map(d => d.id);
        
        const newTurmas = state.turmas.filter(t => t.id !== action.payload.id);
        const newDisciplinas = state.disciplinas.filter(d => d.turmaId !== action.payload.id);
        const newAtribuicoes = state.atribuicoes.filter(a => !disciplinasToDelete.includes(a.disciplinaId));
        const newGrade = state.grade.filter(g => g.turmaId !== action.payload.id);
        
        addChange('turmas', newTurmas);
        addChange('disciplinas', newDisciplinas);
        addChange('atribuicoes', newAtribuicoes);
        addChange('grade', newGrade);
        
        return {
            ...state,
            turmas: newTurmas,
            disciplinas: newDisciplinas,
            atribuicoes: newAtribuicoes,
            grade: newGrade,
        };
    }
    // Disciplinas
    case 'ADD_DISCIPLINA': {
        const sanitizedPayload: Disciplina = { ...action.payload, nome: sanitizeString(action.payload.nome) };
        const newDisciplinas = [...state.disciplinas, sanitizedPayload];
        addChange('disciplinas', newDisciplinas);
        return { ...state, disciplinas: newDisciplinas };
    }
    case 'UPDATE_DISCIPLINA': {
        const sanitizedPayload: Disciplina = { ...action.payload, nome: sanitizeString(action.payload.nome) };
        const newDisciplinas = state.disciplinas.map(d => d.id === sanitizedPayload.id ? sanitizedPayload : d);
        addChange('disciplinas', newDisciplinas);
        return { ...state, disciplinas: newDisciplinas };
    }
    case 'DELETE_DISCIPLINA': {
        const newDisciplinas = state.disciplinas.filter(d => d.id !== action.payload.id);
        const newAtribuicoes = state.atribuicoes.filter(a => a.disciplinaId !== action.payload.id);
        const newGrade = state.grade.filter(g => g.disciplinaId !== action.payload.id);

        addChange('disciplinas', newDisciplinas);
        addChange('atribuicoes', newAtribuicoes);
        addChange('grade', newGrade);

        return {
            ...state,
            disciplinas: newDisciplinas,
            atribuicoes: newAtribuicoes,
            grade: newGrade,
        };
    }
    // Professores
    case 'ADD_PROFESSOR': {
        const sanitizedPayload: Professor = { ...action.payload, nome: sanitizeString(action.payload.nome) };
        const newProfessores = [...state.professores, sanitizedPayload];
        addChange('professores', newProfessores);
        return { ...state, professores: newProfessores };
    }
    case 'UPDATE_PROFESSOR': {
        const sanitizedPayload: Professor = { ...action.payload, nome: sanitizeString(action.payload.nome) };
        const newProfessores = state.professores.map(p => p.id === sanitizedPayload.id ? sanitizedPayload : p);
        addChange('professores', newProfessores);
        return { ...state, professores: newProfessores };
    }
    case 'BATCH_UPDATE_PROFESSORS': {
        const updatedProfessorsMap = new Map(action.payload.professors.map(p => [p.id, p]));
        const newProfessores = state.professores.map(p => updatedProfessorsMap.get(p.id) || p);
        addChange('professores', newProfessores);
        return { ...state, professores: newProfessores };
    }
    case 'DELETE_PROFESSOR': {
        const newProfessores = state.professores.filter(p => p.id !== action.payload.id);
        const newAtribuicoes = state.atribuicoes.map(a => ({
                ...a,
                professores: a.professores.filter(pId => pId !== action.payload.id)
            }));
        const newGrade = state.grade.filter(g => g.professorId !== action.payload.id);

        addChange('professores', newProfessores);
        addChange('atribuicoes', newAtribuicoes);
        addChange('grade', newGrade);
        return {
            ...state,
            professores: newProfessores,
            atribuicoes: newAtribuicoes,
            grade: newGrade,
        };
    }
    // Atribuições
    case 'UPDATE_ATRIBUICAO': {
        let newAtribuicoes;
        const existing = state.atribuicoes.find(a => a.disciplinaId === action.payload.disciplinaId);
        if (existing) {
            newAtribuicoes = state.atribuicoes.map(a => a.disciplinaId === action.payload.disciplinaId ? action.payload : a);
        } else {
            newAtribuicoes = [...state.atribuicoes, action.payload];
        }
        addChange('atribuicoes', newAtribuicoes);
        return { ...state, atribuicoes: newAtribuicoes };
    }
    case 'DELETE_ATRIBUICAO': {
        const newAtribuicoes = state.atribuicoes.filter(a => a.disciplinaId !== action.payload.disciplinaId);
        addChange('atribuicoes', newAtribuicoes);
        return { ...state, atribuicoes: newAtribuicoes };
    }
    // General
    case 'UPDATE_ANO':
        addChange('ano', action.payload);
        return { ...state, ano: action.payload };
    case 'SET_ALERTS':
      // Alerts are derived state, no need to save.
      return { ...state, alertas: action.payload };
    // Clipboard
    case 'COPY_SLOT': {
        const { sourceSlotId } = action.payload;
        const sourceSlot = state.grade.find(s => s.id === sourceSlotId);
        if (!sourceSlot) return state;
        return { ...state, clipboard: { sourceSlot, type: 'copy' }, draggedItem: null };
    }
    case 'CUT_SLOT': {
        const { sourceSlotId } = action.payload;
        const sourceSlot = state.grade.find(s => s.id === sourceSlotId);
        if (!sourceSlot) return state;
        const newGrade = state.grade.filter(s => s.id !== sourceSlotId);
        addChange('grade', newGrade);
        return { ...state, grade: newGrade, clipboard: { sourceSlot, type: 'cut' }, draggedItem: null, selectedSlotId: null };
    }
    case 'PASTE_SLOT': {
        const { destinationId } = action.payload;
        const { clipboard, disciplinas } = state;
        if (!clipboard) return state;

        const { sourceSlot } = clipboard;
        const destInfo = parseSlotId(destinationId);

        const disciplinaPasted = disciplinas.find(d => d.id === sourceSlot.disciplinaId);
        const isPastingDivided = !!disciplinaPasted?.divisao;

        // Determine the correct final ID. If pasting a non-divided class, it must be the base ID.
        const finalId = isPastingDivided ? destinationId : `${destInfo.turmaId}_${destInfo.dia}_${destInfo.horario}`;
        
        const newSlot: GradeSlot = {
            ...sourceSlot,
            id: finalId,
            turmaId: destInfo.turmaId,
            dia: destInfo.dia,
            horario: destInfo.horario,
        };
        
        const isPastingFullSlot = !isPastingDivided;

        const gradeFiltered = state.grade.filter(s => {
            const sInfo = parseSlotId(s.id);
            const isSameCell = sInfo.turmaId === destInfo.turmaId && sInfo.dia === destInfo.dia && sInfo.horario === destInfo.horario;

            if (!isSameCell) return true;

            if (isPastingFullSlot) {
                // Remove everything from the target cell if pasting a full slot.
                return false;
            } else {
                // Pasting a divided slot.
                const isFullSlotInTarget = !(s.id.endsWith('-0') || s.id.endsWith('-1'));
                if (isFullSlotInTarget) return false; // Remove an existing full slot.
                if (s.id === destinationId) return false; // Remove the specific sub-slot being pasted into.
                return true; // Keep the other sub-slot.
            }
        });
        
        const newGrade = [...gradeFiltered, newSlot];
        addChange('grade', newGrade);

        return {
            ...state,
            grade: newGrade,
            clipboard: clipboard.type === 'cut' ? null : state.clipboard,
        };
    }
    // BNCC
    case 'CREATE_BNCC': {
        const { nome } = action.payload;
        const bnccId = `bncc-${Date.now()}`;
        const newBncc: Bncc = { id: bnccId, nome };

        const newDisciplinas = state.disciplinas.map(d => {
            if (d.nome === nome) {
                return { ...d, bnccId };
            }
            return d;
        });
        
        addChange('disciplinas', newDisciplinas);
        addChange('bncc', [...state.bncc, newBncc]);

        return {
            ...state,
            disciplinas: newDisciplinas,
            bncc: [...state.bncc, newBncc]
        };
    }
    case 'DELETE_BNCC': {
        const { bnccId } = action.payload;

        const newDisciplinas = state.disciplinas.map(d => {
            if (d.bnccId === bnccId) {
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                const { bnccId: _, ...rest } = d;
                return rest;
            }
            return d;
        });

        const newBncc = state.bncc.filter(b => b.id !== bnccId);

        addChange('disciplinas', newDisciplinas);
        addChange('bncc', newBncc);

        return {
            ...state,
            disciplinas: newDisciplinas,
            bncc: newBncc
        };
    }
  }
  return state;
};

const statefulReducer = (state: AppState, action: Action): AppState => {
  // Handle UI-only actions that shouldn't affect history or validation
  if (action.type === 'SHOW_TOAST') {
    return { ...state, toastMessage: action.payload };
  }
  if (action.type === 'DRAG_START') {
    return { ...state, draggedItem: action.payload, clipboard: null, selectedSlotId: null };
  }
  if (action.type === 'DRAG_END') {
    return { ...state, draggedItem: null };
  }
  if (action.type === 'SELECT_SLOT') {
    return { ...state, selectedSlotId: action.payload.slotId };
  }
  if (action.type === 'SET_ONLINE_USERS') {
    return { ...state, onlineUsers: action.payload };
  }
  if (action.type === 'SET_SAVE_STATUS') {
    return { ...state, saveStatus: action.payload };
  }


  if (action.type === 'CLEAR_DATA') {
    // For CLEAR_DATA, we replace all fields, so we can send the entire initial state.
    const { toastMessage, draggedItem, clipboard, selectedSlotId, onlineUsers, saveStatus, ...initialData } = initialState;
    Object.keys(initialData).forEach(key => {
        addChange(key as keyof AppState, (initialData as any)[key]);
    });
    
    // Optimistically update local state
    const validatedInitialState = { ...initialState, alertas: validateState(initialState) };
    history = [validatedInitialState];
    historyIndex = 0;
    return validatedInitialState;
  }

  let newState;
  if (action.type === 'UNDO') {
    if (historyIndex > 0) {
      historyIndex--;
    }
    // For UNDO, we replace the entire state, so we must add all savable fields to the changeset.
    const { alertas, toastMessage, draggedItem, clipboard, selectedSlotId, onlineUsers, saveStatus, ...savableState } = history[historyIndex];
    Object.keys(savableState).forEach(key => {
        addChange(key as keyof AppState, (savableState as any)[key]);
    });
    return history[historyIndex];
  }

  if (action.type === 'REDO') {
    if (historyIndex < history.length - 1) {
      historyIndex++;
    }
    const { alertas, toastMessage, draggedItem, clipboard, selectedSlotId, onlineUsers, saveStatus, ...savableState } = history[historyIndex];
    Object.keys(savableState).forEach(key => {
        addChange(key as keyof AppState, (savableState as any)[key]);
    });
    return history[historyIndex];
  }
  
  if (action.type === 'SET_STATE') {
    newState = sanitizeLoadedState(action.payload);
    // On a full state load, we need to immediately validate to show initial alerts
    newState.alertas = validateState(newState);
    newState.saveStatus = 'saved';
     // For SET_STATE, we also replace the entire state.
    const { alertas, toastMessage, draggedItem, clipboard, selectedSlotId, onlineUsers, saveStatus, ...savableState } = newState;
    Object.keys(savableState).forEach(key => {
        addChange(key as keyof AppState, (savableState as any)[key]);
    });
  } else {
    newState = dataReducer(state, action);
  }
  
  if (newState !== state) {
    const nextState = { 
        ...newState, 
        toastMessage: state.toastMessage, 
        draggedItem: state.draggedItem, 
        selectedSlotId: state.selectedSlotId, 
        onlineUsers: state.onlineUsers, 
        saveStatus: state.saveStatus,
        lastModifiedBy: state.lastModifiedBy,
        lastModifiedAt: state.lastModifiedAt,
    };
    
    const shouldUpdateModifier = action.type !== 'SET_STATE';

    if (shouldUpdateModifier) {
        if (FIREBASE_ENABLED && auth) {
            const currentUser = auth.currentUser;
            nextState.lastModifiedBy = currentUser ? (currentUser.displayName || currentUser.email) : 'Sistema';
        } else {
            nextState.lastModifiedBy = 'Usuário Local';
        }
        nextState.lastModifiedAt = new Date().toISOString();
        addChange('lastModifiedBy', nextState.lastModifiedBy);
        addChange('lastModifiedAt', nextState.lastModifiedAt);
    }

    if (action.type === 'SET_STATE' || action.type === 'POPULATE_GRADE') {
       history = [nextState];
       historyIndex = 0;
    } else if (action.type !== 'SET_ALERTS') { // Do not record alert-only changes in history
       history = history.slice(0, historyIndex + 1);
       history.push(nextState);

       const MAX_HISTORY = 50;
       if (history.length > MAX_HISTORY) {
         history.splice(0, history.length - MAX_HISTORY);
       }
       
       historyIndex = history.length - 1;
    }
    
    return nextState;
  }
  
  return state;
};


export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(statefulReducer, initialState, (initial) => {
    // This entire block must be fail-safe to prevent app crashes on load.
    try {
        if (!FIREBASE_ENABLED) {
            const savedData = localStorage.getItem(LOCAL_STORAGE_KEY);
            if (savedData) {
                // All parsing, sanitizing, and validating happens inside the try block.
                const parsedData = JSON.parse(savedData);
                const sanitizedData = sanitizeLoadedState(parsedData);
                const validatedState = { ...sanitizedData, alertas: validateState(sanitizedData) };
                history = [validatedState];
                historyIndex = 0;
                return validatedState;
            }
        }
        // If no saved data or if Firebase is enabled, start with a clean, validated state.
        const validatedInitialState = { ...initial, alertas: validateState(initial) };
        history = [validatedInitialState];
        historyIndex = 0;
        return validatedInitialState;
    } catch (error) {
        console.error("CRITICAL ERROR: Failed to initialize state from localStorage. Data might be corrupted. Resetting application state.", error);
        
        // If any error occurs, clear the corrupted data and start fresh.
        try {
            localStorage.removeItem(LOCAL_STORAGE_KEY);
        } catch (removeError) {
            console.error("Failed to remove corrupted localStorage key.", removeError);
        }
        
        // Return a clean, validated initial state to ensure the app can load.
        const validatedInitialState = { ...initialState, alertas: validateState(initialState) };
        history = [validatedInitialState];
        historyIndex = 0;
        return validatedInitialState;
    }
  });

  const isRemoteChange = useRef(false);
  const hasLoadedFromDB = useRef(false);


  // Effect to listen for real-time updates from Firestore
  useEffect(() => {
    if (!FIREBASE_ENABLED || !db) return;

    const docRef = db.collection('timetables').doc('default');

    const unsubscribe = docRef.onSnapshot((doc) => {
      hasLoadedFromDB.current = true;
      if (doc.exists && !doc.metadata.hasPendingWrites) {
        const dataFromDb = doc.data() as AppState;
        if (dataFromDb) {
          // Compare timestamps to prevent overwriting newer local state with a stale server echo.
          const remoteTimestamp = dataFromDb.lastModifiedAt ? new Date(dataFromDb.lastModifiedAt).getTime() : 0;
          const localTimestamp = state.lastModifiedAt ? new Date(state.lastModifiedAt).getTime() : 0;

          // Only apply the update if the remote data is demonstrably newer.
          if (remoteTimestamp > localTimestamp) {
            console.log("Received newer remote update from Firestore. Applying.");
            isRemoteChange.current = true; // Flag that the next state change is from remote
            
            // Clear pending local changes to prevent overwriting the remote state with stale data
            pendingChangesRef.current.clear();
            
            dispatch({ type: 'SET_STATE', payload: dataFromDb });
          } else {
             console.log(`Ignored stale remote update. Remote: ${remoteTimestamp}, Local: ${localTimestamp}`);
          }
        }
      } else if (!doc.exists) {
        // If the document doesn't exist in Firestore, create it with the initial state.
        const { toastMessage, draggedItem, clipboard, selectedSlotId, onlineUsers, saveStatus, ...dataToSave } = initialState;
        docRef.set(dataToSave);
      }
    }, (error: any) => {
      hasLoadedFromDB.current = true;
      console.error("Error listening to Firestore document:", error);
      if (error.code === 'permission-denied') {
        dispatch({ type: 'SHOW_TOAST', payload: 'Permissão negada. Verifique as Regras de Segurança do Firestore.' });
      } else {
        dispatch({ type: 'SHOW_TOAST', payload: 'Erro de conexão com o banco de dados.' });
      }
    });

    return () => unsubscribe();
  }, [state.lastModifiedAt]); // Dependency ensures the listener closure has the latest timestamp for comparison

  // Effect for real-time user presence
  useEffect(() => {
    if (!FIREBASE_ENABLED || !auth || !db) return;

    let presenceInterval: number | undefined;
    let unsubscribeFromUsers: (() => void) | undefined;

    const cleanup = () => {
      if (presenceInterval) clearInterval(presenceInterval);
      if (unsubscribeFromUsers) unsubscribeFromUsers();
    };

    const unsubscribeAuth = auth.onAuthStateChanged(user => {
      cleanup(); // Clean up from previous user session

      if (user) {
        const userDocRef = db.collection('presence').doc(user.uid);
        
        const presenceData = {
          id: user.uid,
          name: user.displayName || user.email || 'Usuário Anônimo',
          email: user.email || '',
        };

        // Set initial presence and start heartbeat
        userDocRef.set({
          ...presenceData,
          lastSeen: firebase.default.firestore.FieldValue.serverTimestamp()
        });
        
        presenceInterval = window.setInterval(() => {
          userDocRef.update({ lastSeen: firebase.default.firestore.FieldValue.serverTimestamp() });
        }, 15000); // 15 seconds

        // Listen for all online users
        unsubscribeFromUsers = db.collection('presence')
          .where('lastSeen', '>', new Date(Date.now() - 30000)) // seen in last 30 seconds
          .onSnapshot(snapshot => {
            const onlineUsersData = snapshot.docs.map(doc => doc.data() as PresenceUser);
            dispatch({ type: 'SET_ONLINE_USERS', payload: onlineUsersData });
          }, (error) => {
            console.error("Error listening to presence collection:", error);
          });

      } else {
        // User is signed out
        dispatch({ type: 'SET_ONLINE_USERS', payload: [] });
      }
    });

    return () => {
      unsubscribeAuth();
      cleanup();
       const currentUser = auth.currentUser;
      if (currentUser) {
          db.collection('presence').doc(currentUser.uid).delete();
      }
    };
  }, []);


  // --- NEW: Efficient save effect ---
  useEffect(() => {
    const handler = setTimeout(() => {
        const changesToSave = pendingChangesRef.current;
        if (changesToSave.size === 0 || isRemoteChange.current) {
            if (isRemoteChange.current) {
                isRemoteChange.current = false;
            }
            return; // No local changes to save
        }
        
        pendingChangesRef.current = new Map(); // Clear pending changes immediately
        dispatch({ type: 'SET_SAVE_STATUS', payload: 'saving' });
        
        if (FIREBASE_ENABLED && db && hasLoadedFromDB.current) {
            const batch = db.batch();
            const docRef = db.collection('timetables').doc('default');
            
            const updates: { [key: string]: any } = {};
            changesToSave.forEach((value, key) => {
                updates[key] = value;
            });
            
            batch.update(docRef, updates);
            
            batch.commit()
                .then(() => {
                    dispatch({ type: 'SET_SAVE_STATUS', payload: 'saved' });
                })
                .catch(error => {
                    console.error("Error committing batch to Firestore: ", error);
                    dispatch({ type: 'SHOW_TOAST', payload: 'Falha ao salvar dados.' });
                    dispatch({ type: 'SET_SAVE_STATUS', payload: 'error' });
                });
        } else if (!FIREBASE_ENABLED) {
            try {
                const currentData = localStorage.getItem(LOCAL_STORAGE_KEY);
                const parsedData = currentData ? JSON.parse(currentData) : {};
                
                changesToSave.forEach((value, key) => {
                    parsedData[key] = value;
                });
                
                localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(parsedData));
                dispatch({ type: 'SET_SAVE_STATUS', payload: 'saved' });
            } catch (error) {
                console.error("Error writing to localStorage: ", error);
                dispatch({ type: 'SHOW_TOAST', payload: 'Falha ao salvar dados localmente.' });
                dispatch({ type: 'SET_SAVE_STATUS', payload: 'error' });
            }
        }
    }, 2000); // Debounce for 2 seconds

    return () => clearTimeout(handler);
  }, [state]); // Effect runs on any state change to check for pending updates.

  
  // Create a stable dependency for the validation effect
  const validationDeps = JSON.stringify({
    grade: state.grade,
    professores: state.professores,
    disciplinas: state.disciplinas,
    atribuicoes: state.atribuicoes,
    turmas: state.turmas,
  });

  // Debounced effect for running validation logic
  useEffect(() => {
    const handler = setTimeout(() => {
        const stateForValidation: AppState = { ...state, ...JSON.parse(validationDeps) };
        const newAlerts = validateState(stateForValidation);
        
        // Only dispatch if alerts have actually changed to prevent re-render loops
        if (JSON.stringify(newAlerts) !== JSON.stringify(state.alertas)) {
            dispatch({ type: 'SET_ALERTS', payload: newAlerts });
        }
    }, 300); // 300ms debounce

    return () => clearTimeout(handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [validationDeps]); // Reruns whenever the core data changes


  const handleUndoRedo = useCallback((e: KeyboardEvent) => {
    if (e.ctrlKey && e.key === 'z') {
      e.preventDefault();
      dispatch({ type: 'UNDO' });
    }
    if (e.ctrlKey && e.key === 'y') {
      e.preventDefault();
      dispatch({ type: 'REDO' });
    }
  }, []);
  
  useEffect(() => {
    window.addEventListener('keydown', handleUndoRedo);
    return () => {
      window.removeEventListener('keydown', handleUndoRedo);
    };
  }, [handleUndoRedo]);

  return (
    <DataContext.Provider value={{ state, dispatch }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};
