

import React, { createContext, useContext, useReducer, useEffect, useCallback, ReactNode, useRef } from 'react';
import { AppState, Action, GradeSlot, Bncc, PresenceUser, Turma, Alerta, Professor } from '../types';
import { validateState } from '../services/validationService';
import { db, auth } from '../firebaseConfig';
import * as firebase from 'firebase/compat/app';
import { FIREBASE_ENABLED } from '../config';
import { LOCAL_STORAGE_KEY } from '../constants';

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
  // Use a robust separator that is not expected in the turmaId itself.
  const parts = id.split('_');
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

    if (typeof newState.ano !== 'number' || isNaN(newState.ano)) {
        newState.ano = new Date().getFullYear();
    }

    const arraysToEnsure: (keyof AppState)[] = ['cursos', 'turmas', 'disciplinas', 'professores', 'atribuicoes', 'grade', 'alertas', 'bncc', 'onlineUsers'];
    arraysToEnsure.forEach(key => {
        if (!Array.isArray(newState[key])) {
            (newState as any)[key] = [];
        }
    });

    if (Array.isArray(newState.turmas)) {
      newState.turmas = newState.turmas.map((t: any) => {
        if (!t) return null; // Filter out null/undefined entries
        return {
          ...t,
          isModular: !!t.isModular, // Ensure isModular exists and is a boolean
        };
      }).filter(Boolean) as Turma[];
    }
    
    if (Array.isArray(newState.professores)) {
        newState.professores = newState.professores.map(prof => {
            if (prof && (typeof prof.disponibilidade !== 'object' || prof.disponibilidade === null || Array.isArray(prof.disponibilidade))) {
                return { ...prof, disponibilidade: {} };
            }
            return prof;
        }).filter(Boolean); // Remove null/undefined entries
    }

    // Deeply sanitize the grade array to prevent runtime errors from corrupted data.
    if (Array.isArray(newState.grade)) {
        newState.grade = newState.grade.filter(slot => {
            if (!slot || typeof slot !== 'object') return false;
            const requiredKeys: (keyof GradeSlot)[] = ['id', 'turmaId', 'dia', 'horario', 'disciplinaId', 'professorId'];
            // Ensure all required keys exist and are non-empty strings
            return requiredKeys.every(key => typeof slot[key] === 'string' && slot[key]);
        });
    }
    
    // Create a set of valid turma IDs for quick lookups.
    const validTurmaIds = new Set(newState.turmas.map(t => t.id));

    // Also filter out grade slots that point to a non-existent turma.
    newState.grade = newState.grade.filter(slot => {
        if (!validTurmaIds.has(slot.turmaId)) {
            console.warn(`Removing orphaned grade slot with invalid turmaId: ${slot.turmaId}`, slot);
            return false;
        }
        return true;
    });

    return newState;
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
      return { ...state, grade: newGrade };
    }
    case 'POPULATE_GRADE': {
      return { ...state, grade: action.payload };
    }
    case 'DELETE_SLOT': {
        const { slotId } = action.payload;
        const slotExists = state.grade.some(s => s.id === slotId);
        if (!slotExists) return state; // Nothing to delete

        const newGrade = state.grade.filter(s => s.id !== slotId);
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
        
        return { ...state, grade: remainingGrade };
    }
    // Cursos
    case 'ADD_CURSO':
        return { ...state, cursos: [...state.cursos, action.payload] };
    case 'UPDATE_CURSO':
        return { ...state, cursos: state.cursos.map(c => c.id === action.payload.id ? action.payload : c) };
    case 'DELETE_CURSO': {
        const turmasToDelete = state.turmas.filter(t => t.cursoId === action.payload.id).map(t => t.id);
        const disciplinasToDelete = state.disciplinas.filter(d => turmasToDelete.includes(d.turmaId)).map(d => d.id);
        return {
            ...state,
            cursos: state.cursos.filter(c => c.id !== action.payload.id),
            turmas: state.turmas.filter(t => t.cursoId !== action.payload.id),
            disciplinas: state.disciplinas.filter(d => !turmasToDelete.includes(d.turmaId)),
            atribuicoes: state.atribuicoes.filter(a => !disciplinasToDelete.includes(a.disciplinaId)),
            grade: state.grade.filter(g => !turmasToDelete.includes(g.turmaId)),
        };
    }
    // Turmas
    case 'ADD_TURMA':
        return { ...state, turmas: [...state.turmas, action.payload] };
    case 'UPDATE_TURMA':
        return { ...state, turmas: state.turmas.map(t => t.id === action.payload.id ? action.payload : t) };
    case 'DELETE_TURMA': {
        const disciplinasToDelete = state.disciplinas.filter(d => d.turmaId === action.payload.id).map(d => d.id);
        return {
            ...state,
            turmas: state.turmas.filter(t => t.id !== action.payload.id),
            disciplinas: state.disciplinas.filter(d => d.turmaId !== action.payload.id),
            atribuicoes: state.atribuicoes.filter(a => !disciplinasToDelete.includes(a.disciplinaId)),
            grade: state.grade.filter(g => g.turmaId !== action.payload.id),
        };
    }
    // Disciplinas
    case 'ADD_DISCIPLINA':
        return { ...state, disciplinas: [...state.disciplinas, action.payload] };
    case 'UPDATE_DISCIPLINA':
        return { ...state, disciplinas: state.disciplinas.map(d => d.id === action.payload.id ? action.payload : d) };
    case 'DELETE_DISCIPLINA':
        return {
            ...state,
            disciplinas: state.disciplinas.filter(d => d.id !== action.payload.id),
            atribuicoes: state.atribuicoes.filter(a => a.disciplinaId !== action.payload.id),
            grade: state.grade.filter(g => g.disciplinaId !== action.payload.id),
        };
    // Professores
    case 'ADD_PROFESSOR':
        return { ...state, professores: [...state.professores, action.payload] };
    case 'UPDATE_PROFESSOR':
        return { ...state, professores: state.professores.map(p => p.id === action.payload.id ? action.payload : p) };
    case 'BATCH_UPDATE_PROFESSORS': {
        const updatedProfessorsMap = new Map(action.payload.professors.map(p => [p.id, p]));
        const newProfessors = state.professores.map(p => updatedProfessorsMap.get(p.id) || p);
        return { ...state, professores: newProfessors };
    }
    case 'DELETE_PROFESSOR':
        return {
            ...state,
            professores: state.professores.filter(p => p.id !== action.payload.id),
            atribuicoes: state.atribuicoes.map(a => ({
                ...a,
                professores: a.professores.filter(pId => pId !== action.payload.id)
            })),
            grade: state.grade.filter(g => g.professorId !== action.payload.id),
        };
    // Atribuições
    case 'UPDATE_ATRIBUICAO': {
        const existing = state.atribuicoes.find(a => a.disciplinaId === action.payload.disciplinaId);
        if (existing) {
            return { ...state, atribuicoes: state.atribuicoes.map(a => a.disciplinaId === action.payload.disciplinaId ? action.payload : a) };
        }
        return { ...state, atribuicoes: [...state.atribuicoes, action.payload] };
    }
    case 'DELETE_ATRIBUICAO':
        return { ...state, atribuicoes: state.atribuicoes.filter(a => a.disciplinaId !== action.payload.disciplinaId) };
    // General
    case 'UPDATE_ANO':
        return { ...state, ano: action.payload };
    case 'SET_ALERTS':
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

        return {
            ...state,
            disciplinas: newDisciplinas,
            bncc: state.bncc.filter(b => b.id !== bnccId)
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
    if (FIREBASE_ENABLED && db) {
        // Set Firestore document to initial state. The listener will handle the update.
        const { toastMessage, draggedItem, clipboard, selectedSlotId, onlineUsers, saveStatus, ...initialData } = initialState;
        db.collection('timetables').doc('default').set(initialData);
    } else {
        localStorage.removeItem(LOCAL_STORAGE_KEY);
    }

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
    return history[historyIndex];
  }

  if (action.type === 'REDO') {
    if (historyIndex < history.length - 1) {
      historyIndex++;
    }
    return history[historyIndex];
  }
  
  if (action.type === 'SET_STATE') {
    newState = sanitizeLoadedState(action.payload);
    // On a full state load, we need to immediately validate to show initial alerts
    newState.alertas = validateState(newState);
    newState.saveStatus = 'saved';
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
    }

    if (action.type === 'SET_STATE' || action.type === 'POPULATE_GRADE') {
       history = [nextState];
       historyIndex = 0;
    } else if (action.type !== 'SET_ALERTS') { // Do not record alert-only changes in history
       history = history.slice(0, historyIndex + 1);
       history.push(nextState);
       historyIndex = history.length - 1;
    }
    
    return nextState;
  }
  
  return state;
};


export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(statefulReducer, initialState, (initial) => {
    let loadedState = initial;
    if (!FIREBASE_ENABLED) {
        try {
            const savedData = localStorage.getItem(LOCAL_STORAGE_KEY);
            if (savedData) {
                loadedState = sanitizeLoadedState(JSON.parse(savedData));
            }
        } catch (error) {
            console.error("Failed to load state from localStorage", error);
        }
    }
    
    const validatedState = { ...loadedState, alertas: validateState(loadedState) };
    history = [validatedState];
    historyIndex = 0;
    return validatedState;
  });

  const isRemoteChange = useRef(false);
  const hasLoadedFromDB = useRef(false);


  // Effect to listen for real-time updates from Firestore
  useEffect(() => {
    if (!FIREBASE_ENABLED || !db) return;

    const docRef = db.collection('timetables').doc('default');

    const unsubscribe = docRef.onSnapshot((doc) => {
      hasLoadedFromDB.current = true;
      // We only update state from server changes, not our own local writes, to prevent loops.
      if (doc.exists && !doc.metadata.hasPendingWrites) {
        console.log("Received remote update from Firestore.");
        const dataFromDb = doc.data();
        if (dataFromDb) {
          isRemoteChange.current = true; // Flag that the next state change is from remote
          dispatch({ type: 'SET_STATE', payload: dataFromDb as AppState });
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

    return () => unsubscribe(); // Cleanup listener on component unmount
  }, []);

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
          lastSeen: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        presenceInterval = window.setInterval(() => {
          userDocRef.update({ lastSeen: firebase.firestore.FieldValue.serverTimestamp() });
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


  // Create a stable, stringified version of the data that should be persisted.
  const { 
    alertas,
    toastMessage, 
    draggedItem, 
    clipboard, 
    selectedSlotId, 
    onlineUsers,
    saveStatus,
    ...dataToSave 
  } = state;
  const savableState = JSON.stringify(dataToSave);


  // Effect to save state changes
  useEffect(() => {
    if (FIREBASE_ENABLED) {
        // --- Firestore logic ---
        if (isRemoteChange.current) {
          isRemoteChange.current = false;
          dispatch({ type: 'SET_SAVE_STATUS', payload: 'saved' });
          return;
        }
        if (!hasLoadedFromDB.current) {
            return;
        }
        dispatch({ type: 'SET_SAVE_STATUS', payload: 'saving' });
        const handler = setTimeout(() => {
          if (!db) return; // Type guard for db being null
          const parsedData = JSON.parse(savableState);
          db.collection('timetables').doc('default').set(parsedData, { merge: true })
              .then(() => {
                  dispatch({ type: 'SET_SAVE_STATUS', payload: 'saved' });
              })
              .catch(error => {
                  console.error("Error writing to Firestore: ", error);
                  dispatch({ type: 'SHOW_TOAST', payload: 'Falha ao salvar dados.' });
                  dispatch({ type: 'SET_SAVE_STATUS', payload: 'error' });
              });
        }, 1000); // Debounce for 1 second
        return () => clearTimeout(handler);

    } else {
        // --- LocalStorage logic ---
        dispatch({ type: 'SET_SAVE_STATUS', payload: 'saving' });
        const handler = setTimeout(() => {
            try {
                localStorage.setItem(LOCAL_STORAGE_KEY, savableState);
                dispatch({ type: 'SET_SAVE_STATUS', payload: 'saved' });
            } catch (error) {
                console.error("Error writing to localStorage: ", error);
                dispatch({ type: 'SHOW_TOAST', payload: 'Falha ao salvar dados localmente.' });
                dispatch({ type: 'SET_SAVE_STATUS', payload: 'error' });
            }
        }, 1000);
        return () => clearTimeout(handler);
    }
  }, [savableState]);
  
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