
import React, { createContext, useContext, useReducer, useEffect, useCallback, ReactNode, useRef } from 'react';
import { AppState, DataAction, GradeSlot, Bncc, Turma } from '../types';
import { validateState } from '../services/validationService';
import { db, auth } from '../firebaseConfig';
import { FIREBASE_ENABLED } from '../config';
import { LOCAL_STORAGE_KEY } from '../constants';
import Logger from '../utils/logger';
import { useUI } from './UIContext';
import { GradeSlotSchema, CursoSchema, TurmaSchema, DisciplinaSchema, ProfessorSchema } from '../utils/schemas';

const DataContext = createContext<{ state: AppState; dispatch: React.Dispatch<DataAction> } | undefined>(undefined);

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
  lastModifiedBy: null,
  lastModifiedAt: null,
};

let history: AppState[] = [initialState];
let historyIndex = 0;
const MAX_HISTORY = 20; // Reduced from 50 to save memory

const parseSlotId = (id: string) => {
  if (!id || typeof id !== 'string') return { turmaId: '', dia: '', horario: '' };
  const parts = id.split('_');
  if (parts.length < 3) return { turmaId: '', dia: '', horario: '' };
  const turmaId = parts[0] || '';
  const dia = parts[1] || '';
  let horario = parts.slice(2).join('_');
  const subSlotMatch = horario.match(/(.*)-([01])$/);
  if (subSlotMatch) horario = subSlotMatch[1];
  return { turmaId, dia, horario };
};

const sanitizeLoadedState = (loadedState: any): AppState => {
    const newState = { ...initialState, ...loadedState };
    if (typeof newState.ano !== 'number' || isNaN(newState.ano)) newState.ano = new Date().getFullYear();
    
    const arraysToEnsure: (keyof AppState)[] = ['cursos', 'turmas', 'disciplinas', 'professores', 'atribuicoes', 'grade', 'alertas', 'bncc'];
    arraysToEnsure.forEach(key => {
        if (!Array.isArray(newState[key])) (newState as any)[key] = [];
    });

    if (Array.isArray(newState.turmas)) {
      newState.turmas = newState.turmas.map((t: any) => t ? { ...t, isModular: !!t.isModular } : null).filter(Boolean) as Turma[];
    }
    
    // We can now rely on the Schema validation later to clean up deeper issues, 
    // but basic array structure is ensured here.
    return newState;
};

const pendingChangesRef = { current: new Map<string, any>() };
const addChange = (field: keyof AppState, value: any) => {
    pendingChangesRef.current.set(field, value);
};

const dataReducer = (state: AppState, action: DataAction): AppState => {
  switch (action.type) {
    case 'UPDATE_GRADE': {
        try {
            if(action.payload.slot) GradeSlotSchema.parse(action.payload.slot);
            const { id, slot } = action.payload;
            const newGrade = state.grade.filter(s => s.id !== id);
            if (slot) newGrade.push(slot);
            addChange('grade', newGrade);
            return { ...state, grade: newGrade };
        } catch (e) {
            Logger.error('Invalid Grade Slot Data', e, 'DataContext');
            return state;
        }
    }
    case 'POPULATE_GRADE': {
        addChange('grade', action.payload);
        return { ...state, grade: action.payload };
    }
    case 'DELETE_SLOT': {
        const { slotId } = action.payload;
        const newGrade = state.grade.filter(s => s.id !== slotId);
        addChange('grade', newGrade);
        return { ...state, grade: newGrade };
    }
    case 'SWAP_GRADE_SLOTS': {
        const { sourceId, destinationId } = action.payload;
        const sourceSlot = state.grade.find(s => s.id === sourceId);
        if (!sourceSlot) return state;

        const destSlot = state.grade.find(s => s.id === destinationId);
        const sourceInfo = parseSlotId(sourceId);
        const destInfo = parseSlotId(destinationId);

        const remainingGrade = state.grade.filter(s => s.id !== sourceId && s.id !== destinationId);

        const newSourceSlot = { ...sourceSlot, id: destinationId, turmaId: destInfo.turmaId, dia: destInfo.dia, horario: destInfo.horario };
        remainingGrade.push(newSourceSlot);

        if (destSlot) {
            const newDestSlot = { ...destSlot, id: sourceId, turmaId: sourceInfo.turmaId, dia: sourceInfo.dia, horario: sourceInfo.horario };
            remainingGrade.push(newDestSlot);
        }
        addChange('grade', remainingGrade);
        return { ...state, grade: remainingGrade };
    }
    case 'PASTE_SLOT': {
        const { destinationId, sourceSlot, isCut } = action.payload;
        const destInfo = parseSlotId(destinationId);
        const disciplinaPasted = state.disciplinas.find(d => d.id === sourceSlot.disciplinaId);
        const isPastingDivided = !!disciplinaPasted?.divisao;

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
            if (isPastingFullSlot) return false;
            const isFullSlotInTarget = !(s.id.endsWith('-0') || s.id.endsWith('-1'));
            if (isFullSlotInTarget) return false;
            if (s.id === destinationId) return false;
            return true;
        });
        
        let finalGrade = [...gradeFiltered, newSlot];
        if (isCut) {
            finalGrade = finalGrade.filter(s => s.id !== sourceSlot.id);
        }

        addChange('grade', finalGrade);
        return { ...state, grade: finalGrade };
    }
    case 'ADD_CURSO': {
        try {
            const validated = CursoSchema.parse(action.payload);
            const newCursos = [...state.cursos, validated];
            addChange('cursos', newCursos);
            return { ...state, cursos: newCursos };
        } catch (e) { Logger.error('Invalid Curso', e); return state; }
    }
    case 'UPDATE_CURSO': {
        try {
             const validated = CursoSchema.parse(action.payload);
             const newCursos = state.cursos.map(c => c.id === validated.id ? validated : c);
             addChange('cursos', newCursos);
             return { ...state, cursos: newCursos };
        } catch (e) { Logger.error('Invalid Curso', e); return state; }
    }
    case 'DELETE_CURSO': {
        const turmasToDelete = state.turmas.filter(t => t.cursoId === action.payload.id).map(t => t.id);
        const newCursos = state.cursos.filter(c => c.id !== action.payload.id);
        const newTurmas = state.turmas.filter(t => t.cursoId !== action.payload.id);
        const newDisciplinas = state.disciplinas.filter(d => !turmasToDelete.includes(d.turmaId));
        const newGrade = state.grade.filter(g => !turmasToDelete.includes(g.turmaId));
        
        addChange('cursos', newCursos);
        addChange('turmas', newTurmas);
        addChange('disciplinas', newDisciplinas);
        addChange('grade', newGrade);
        return { ...state, cursos: newCursos, turmas: newTurmas, disciplinas: newDisciplinas, grade: newGrade };
    }
    case 'ADD_TURMA': {
        try {
            const validated = TurmaSchema.parse(action.payload);
            const newTurmas = [...state.turmas, validated];
            addChange('turmas', newTurmas);
            return { ...state, turmas: newTurmas };
        } catch (e) { Logger.error('Invalid Turma', e); return state; }
    }
    case 'UPDATE_TURMA': {
         try {
            const validated = TurmaSchema.parse(action.payload);
            const newTurmas = state.turmas.map(t => t.id === validated.id ? validated : t);
            addChange('turmas', newTurmas);
            return { ...state, turmas: newTurmas };
         } catch (e) { Logger.error('Invalid Turma', e); return state; }
    }
    case 'DELETE_TURMA': {
         const newTurmas = state.turmas.filter(t => t.id !== action.payload.id);
         const newDisciplinas = state.disciplinas.filter(d => d.turmaId !== action.payload.id);
         const newGrade = state.grade.filter(g => g.turmaId !== action.payload.id);
         addChange('turmas', newTurmas);
         addChange('disciplinas', newDisciplinas);
         addChange('grade', newGrade);
         return { ...state, turmas: newTurmas, disciplinas: newDisciplinas, grade: newGrade };
    }
    case 'ADD_DISCIPLINA': {
        try {
            const validated = DisciplinaSchema.parse(action.payload);
            const newDisciplinas = [...state.disciplinas, validated];
            addChange('disciplinas', newDisciplinas);
            return { ...state, disciplinas: newDisciplinas };
        } catch (e) { Logger.error('Invalid Disciplina', e); return state; }
    }
    case 'UPDATE_DISCIPLINA': {
         try {
            const validated = DisciplinaSchema.parse(action.payload);
            const newDisciplinas = state.disciplinas.map(d => d.id === validated.id ? validated : d);
            addChange('disciplinas', newDisciplinas);
            return { ...state, disciplinas: newDisciplinas };
         } catch (e) { Logger.error('Invalid Disciplina', e); return state; }
    }
    case 'DELETE_DISCIPLINA': {
        const newDisciplinas = state.disciplinas.filter(d => d.id !== action.payload.id);
        const newAtribuicoes = state.atribuicoes.filter(a => a.disciplinaId !== action.payload.id);
        const newGrade = state.grade.filter(g => g.disciplinaId !== action.payload.id);
        addChange('disciplinas', newDisciplinas);
        addChange('atribuicoes', newAtribuicoes);
        addChange('grade', newGrade);
        return { ...state, disciplinas: newDisciplinas, atribuicoes: newAtribuicoes, grade: newGrade };
    }
    case 'ADD_PROFESSOR': {
         try {
            // Manual sanitization safeguard before parsing
            const safePayload = { ...action.payload };
            if (safePayload.disponibilidade) {
                const safeDisp: any = {};
                Object.keys(safePayload.disponibilidade).forEach(k => {
                    const val = safePayload.disponibilidade[k];
                    safeDisp[k] = Array.isArray(val) ? val : (typeof val === 'string' ? [val] : []);
                });
                safePayload.disponibilidade = safeDisp;
            }

            const validated = ProfessorSchema.parse(safePayload);
            const newProfessores = [...state.professores, validated];
            addChange('professores', newProfessores);
            return { ...state, professores: newProfessores };
         } catch (e) { Logger.error('Invalid Professor', e); return state; }
    }
    case 'UPDATE_PROFESSOR': {
         try {
            // Manual sanitization safeguard before parsing:
            // Forces strings into arrays to prevent "invalid_type" before the schema transform runs
            const safePayload = { ...action.payload };
            if (safePayload.disponibilidade) {
                const safeDisp: any = {};
                Object.keys(safePayload.disponibilidade).forEach(k => {
                    const val = safePayload.disponibilidade[k];
                    if (typeof val === 'string') {
                         safeDisp[k] = [val];
                    } else if (Array.isArray(val)) {
                         safeDisp[k] = val;
                    } else {
                         safeDisp[k] = [];
                    }
                });
                safePayload.disponibilidade = safeDisp;
            }

            const validated = ProfessorSchema.parse(safePayload);
            const newProfessores = state.professores.map(p => p.id === validated.id ? validated : p);
            addChange('professores', newProfessores);
            return { ...state, professores: newProfessores };
         } catch (e) { Logger.error('Invalid Professor', e); return state; }
    }
    case 'BATCH_UPDATE_PROFESSORS': {
         try {
             const updatedMap = new Map(action.payload.professors.map(p => [p.id, ProfessorSchema.parse(p)]));
             const newProfessores = state.professores.map(p => updatedMap.has(p.id) ? updatedMap.get(p.id)! : p);
             addChange('professores', newProfessores);
             return { ...state, professores: newProfessores };
         } catch (e) { Logger.error('Invalid Batch Professor Update', e); return state; }
    }
    case 'DELETE_PROFESSOR': {
        const newProfessores = state.professores.filter(p => p.id !== action.payload.id);
        const newAtribuicoes = state.atribuicoes.map(a => ({ ...a, professores: a.professores.filter(pId => pId !== action.payload.id) }));
        const newGrade = state.grade.filter(g => g.professorId !== action.payload.id);
        addChange('professores', newProfessores);
        addChange('atribuicoes', newAtribuicoes);
        addChange('grade', newGrade);
        return { ...state, professores: newProfessores, atribuicoes: newAtribuicoes, grade: newGrade };
    }
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
    case 'UPDATE_ANO':
        addChange('ano', action.payload);
        return { ...state, ano: action.payload };
    case 'SET_ALERTS':
        return { ...state, alertas: action.payload };
    case 'CREATE_BNCC': {
        const { nome } = action.payload;
        const bnccId = `bncc-${Date.now()}`;
        const newBncc: Bncc = { id: bnccId, nome };
        const newDisciplinas = state.disciplinas.map(d => d.nome === nome ? { ...d, bnccId } : d);
        addChange('disciplinas', newDisciplinas);
        addChange('bncc', [...state.bncc, newBncc]);
        return { ...state, disciplinas: newDisciplinas, bncc: [...state.bncc, newBncc] };
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
        return { ...state, disciplinas: newDisciplinas, bncc: newBncc };
    }
    default:
        return state;
  }
};

const statefulReducer = (state: AppState, action: DataAction): AppState => {
  if (action.type === 'CLEAR_DATA') {
    Object.keys(initialState).forEach(key => {
        if (key !== 'alertas') addChange(key as keyof AppState, (initialState as any)[key]);
    });
    const validatedInitialState = { ...initialState, alertas: validateState(initialState) };
    history = [validatedInitialState];
    historyIndex = 0;
    Logger.warn('All data cleared', null, 'DataContext');
    return validatedInitialState;
  }

  let newState;
  if (action.type === 'UNDO') {
    if (historyIndex > 0) historyIndex--;
    const { alertas, ...savableState } = history[historyIndex];
    Object.keys(savableState).forEach(key => addChange(key as keyof AppState, (savableState as any)[key]));
    return history[historyIndex];
  }

  if (action.type === 'REDO') {
    if (historyIndex < history.length - 1) historyIndex++;
    const { alertas, ...savableState } = history[historyIndex];
    Object.keys(savableState).forEach(key => addChange(key as keyof AppState, (savableState as any)[key]));
    return history[historyIndex];
  }
  
  if (action.type === 'SET_STATE') {
    newState = sanitizeLoadedState(action.payload);
    newState.alertas = validateState(newState);
    const { alertas, ...savableState } = newState;
    Object.keys(savableState).forEach(key => addChange(key as keyof AppState, (savableState as any)[key]));
  } else {
    newState = dataReducer(state, action);
  }
  
  if (newState !== state) {
    const nextState = { ...newState };
    
    if (action.type !== 'SET_STATE') {
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
    } else if (action.type !== 'SET_ALERTS') {
       // Optimization: Avoid pushing identical states to history
       const currentStateWithoutAlerts = { ...state, alertas: [] };
       const nextStateWithoutAlerts = { ...nextState, alertas: [] };
       if (JSON.stringify(currentStateWithoutAlerts) !== JSON.stringify(nextStateWithoutAlerts)) {
           history = history.slice(0, historyIndex + 1);
           history.push(nextState);
           if (history.length > MAX_HISTORY) history = history.slice(history.length - MAX_HISTORY);
           historyIndex = history.length - 1;
       }
    }
    
    return nextState;
  }
  return state;
};

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { dispatch: dispatchUI } = useUI();

  const [state, dispatch] = useReducer(statefulReducer, initialState, (initial) => {
    let loadedState = initial;
    if (!FIREBASE_ENABLED) {
        try {
            const savedData = localStorage.getItem(LOCAL_STORAGE_KEY);
            if (savedData) loadedState = sanitizeLoadedState(JSON.parse(savedData));
        } catch (error) {
            Logger.error("Failed to load state from localStorage", error, 'DataContext');
        }
    }
    const validatedState = { ...loadedState, alertas: validateState(loadedState) };
    history = [validatedState];
    historyIndex = 0;
    return validatedState;
  });

  const isRemoteChange = useRef(false);
  const hasLoadedFromDB = useRef(false);
  const isSavingRef = useRef(false);

  useEffect(() => {
    if (!FIREBASE_ENABLED || !db) return;
    const docRef = db.collection('timetables').doc('default');
    const unsubscribe = docRef.onSnapshot((doc) => {
      hasLoadedFromDB.current = true;
      if (doc.exists && !doc.metadata.hasPendingWrites) {
        const dataFromDb = doc.data() as AppState;
        if (dataFromDb) {
          const remoteTimestamp = dataFromDb.lastModifiedAt ? new Date(dataFromDb.lastModifiedAt).getTime() : 0;
          const localTimestamp = state.lastModifiedAt ? new Date(state.lastModifiedAt).getTime() : 0;

          if (remoteTimestamp > localTimestamp && !isSavingRef.current) {
            Logger.info("Received newer remote update from Firestore.", null, 'DataContext');
            isRemoteChange.current = true;
            dispatch({ type: 'SET_STATE', payload: dataFromDb });
          }
        }
      } else if (!doc.exists) {
        const { alertas, ...dataToSave } = initialState;
        docRef.set(dataToSave);
      }
    }, (error: any) => {
      hasLoadedFromDB.current = true;
      Logger.error("Error listening to Firestore", error, 'DataContext');
      dispatchUI({ type: 'SHOW_TOAST', payload: 'Erro de conexão com o banco de dados.' });
    });
    return () => unsubscribe();
  }, [state.lastModifiedAt, dispatchUI]);

  useEffect(() => {
    const handler = setTimeout(() => {
        const changesToSave = pendingChangesRef.current;
        if (changesToSave.size === 0 || isRemoteChange.current) {
            if (isRemoteChange.current) isRemoteChange.current = false;
            return;
        }
        
        isSavingRef.current = true;
        pendingChangesRef.current = new Map();
        dispatchUI({ type: 'SET_SAVE_STATUS', payload: 'saving' });
        
        if (FIREBASE_ENABLED && db && hasLoadedFromDB.current) {
            const batch = db.batch();
            const docRef = db.collection('timetables').doc('default');
            const updates: { [key: string]: any } = {};
            changesToSave.forEach((value, key) => updates[key] = value);
            
            batch.update(docRef, updates);
            batch.commit()
                .then(() => dispatchUI({ type: 'SET_SAVE_STATUS', payload: 'saved' }))
                .catch(error => {
                    Logger.error("Error saving to Firestore", error, 'DataContext');
                    dispatchUI({ type: 'SHOW_TOAST', payload: 'Falha ao salvar dados.' });
                    dispatchUI({ type: 'SET_SAVE_STATUS', payload: 'error' });
                })
                .finally(() => isSavingRef.current = false);
        } else if (!FIREBASE_ENABLED) {
            try {
                const currentData = localStorage.getItem(LOCAL_STORAGE_KEY);
                const parsedData = currentData ? JSON.parse(currentData) : {};
                changesToSave.forEach((value, key) => parsedData[key] = value);
                localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(parsedData));
                dispatchUI({ type: 'SET_SAVE_STATUS', payload: 'saved' });
            } catch (error) {
                Logger.error("Error writing to localStorage", error, 'DataContext');
                dispatchUI({ type: 'SHOW_TOAST', payload: 'Falha ao salvar dados localmente.' });
                dispatchUI({ type: 'SET_SAVE_STATUS', payload: 'error' });
            } finally {
                isSavingRef.current = false;
            }
        } else {
             isSavingRef.current = false;
        }
    }, 2000);

    return () => clearTimeout(handler);
  }, [state, dispatchUI]);
  
  // New Effect: Warn user before unloading if there are pending changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
        if (pendingChangesRef.current.size > 0 || isSavingRef.current) {
            e.preventDefault();
            e.returnValue = ''; // Required for Chrome
        }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  const validationDeps = JSON.stringify({
    grade: state.grade,
    professores: state.professores,
    disciplinas: state.disciplinas,
    atribuicoes: state.atribuicoes,
    turmas: state.turmas,
  });

  useEffect(() => {
    const handler = setTimeout(() => {
        const stateForValidation: AppState = { ...state, ...JSON.parse(validationDeps) };
        const newAlerts = validateState(stateForValidation);
        if (JSON.stringify(newAlerts) !== JSON.stringify(state.alertas)) {
            dispatch({ type: 'SET_ALERTS', payload: newAlerts });
        }
    }, 300);
    return () => clearTimeout(handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [validationDeps]);

  const handleUndoRedo = useCallback((e: KeyboardEvent) => {
    const target = e.target as HTMLElement;
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable) {
        return;
    }

    if (e.ctrlKey && e.key === 'z') { e.preventDefault(); dispatch({ type: 'UNDO' }); }
    if (e.ctrlKey && e.key === 'y') { e.preventDefault(); dispatch({ type: 'REDO' }); }
  }, []);
  
  useEffect(() => {
    window.addEventListener('keydown', handleUndoRedo);
    return () => window.removeEventListener('keydown', handleUndoRedo);
  }, [handleUndoRedo]);

  return (
    <DataContext.Provider value={{ state, dispatch }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) throw new Error('useData must be used within a DataProvider');
  return context;
};
