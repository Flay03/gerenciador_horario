import { z } from 'zod';
import { 
  CursoSchema, 
  TurmaSchema, 
  DisciplinaSchema, 
  ProfessorSchema, 
  AtribuicaoSchema, 
  GradeSlotSchema, 
  BnccSchema 
} from './utils/schemas';

export type Periodo = 'manha' | 'tarde' | 'noite';
export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';
export type GridType = 'regular' | 'modular';

// Infer Types from Zod Schemas
export type Curso = z.infer<typeof CursoSchema>;
export type Turma = z.infer<typeof TurmaSchema>;
export type Disciplina = z.infer<typeof DisciplinaSchema>;
export type Professor = z.infer<typeof ProfessorSchema>;
export type Atribuicao = z.infer<typeof AtribuicaoSchema>;
export type GradeSlot = z.infer<typeof GradeSlotSchema>;
export type Bncc = z.infer<typeof BnccSchema>;

export enum AlertType {
  ProfessorConflitoHorario = 'professor_conflito_horario',
  MaxAulasDia = 'max_aulas_dia',
  Intersticio = 'intersticio',
  Indisponivel = 'indisponivel',
  ConflitoDisponibilidadeDivisao = 'conflito_disponibilidade_divisao',
  TurmaErrada = 'turma_errada',
}

export interface Alerta {
  id: string;
  tipo: AlertType;
  detalhes: string;
  timestamp: number;
  gradeSlotIds: string[];
}

export interface PresenceUser {
    id: string;
    name: string;
    email: string;
}

// --- DATA CONTEXT STATE (Persistent Domain Data) ---
export interface AppState {
  version: string;
  ano: number;
  cursos: Curso[];
  turmas: Turma[];
  disciplinas: Disciplina[];
  professores: Professor[];
  atribuicoes: Atribuicao[];
  grade: GradeSlot[];
  bncc: Bncc[];
  alertas: Alerta[]; // Computed derived state
  lastModifiedBy: string | null;
  lastModifiedAt: string | null;
}

// --- GRID CONTEXT STATE (Transient Interaction Data) ---
export interface DraggedItemInfo {
  type: 'SIDEBAR_ITEM' | 'GRID_ITEM';
  disciplinaId?: string;
  professorId?: string;
  sourceSlotId?: string;
}

export interface ClipboardItem {
  sourceSlot: GradeSlot;
  type: 'copy' | 'cut';
}

export interface GridState {
  draggedItem: DraggedItemInfo | null;
  clipboard: ClipboardItem | null;
  selectedSlotId: string | null;
}

// --- UI CONTEXT STATE (Global Interface State) ---
export interface UIState {
  toastMessage: string | null;
  onlineUsers: PresenceUser[];
  saveStatus: SaveStatus;
  isSidebarCollapsed: boolean;
}

// --- ACTIONS ---

export type DataAction =
  | { type: 'SET_STATE'; payload: AppState }
  // Grade
  | { type: 'UPDATE_GRADE'; payload: { slot: GradeSlot | null; id: string } }
  | { type: 'SWAP_GRADE_SLOTS'; payload: { sourceId: string; destinationId: string } }
  | { type: 'DELETE_SLOT'; payload: { slotId: string } }
  | { type: 'POPULATE_GRADE'; payload: GradeSlot[] }
  | { type: 'PASTE_SLOT'; payload: { destinationId: string; sourceSlot: GradeSlot; isCut: boolean } }
  // Curso
  | { type: 'ADD_CURSO'; payload: Curso }
  | { type: 'UPDATE_CURSO'; payload: Curso }
  | { type: 'DELETE_CURSO'; payload: { id: string } }
  // Turma
  | { type: 'ADD_TURMA'; payload: Turma }
  | { type: 'UPDATE_TURMA'; payload: Turma }
  | { type: 'DELETE_TURMA'; payload: { id: string } }
  // Disciplina
  | { type: 'ADD_DISCIPLINA'; payload: Disciplina }
  | { type: 'UPDATE_DISCIPLINA'; payload: Disciplina }
  | { type: 'DELETE_DISCIPLINA'; payload: { id: string } }
  // Professor
  | { type: 'ADD_PROFESSOR'; payload: Professor }
  | { type: 'UPDATE_PROFESSOR'; payload: Professor }
  | { type: 'DELETE_PROFESSOR'; payload: { id: string } }
  | { type: 'BATCH_UPDATE_PROFESSORS'; payload: { professors: Professor[] } }
  // Atribuicao
  | { type: 'UPDATE_ATRIBUICAO'; payload: Atribuicao }
  | { type: 'DELETE_ATRIBUICAO'; payload: { disciplinaId: string } }
  // General
  | { type: 'UPDATE_ANO'; payload: number }
  | { type: 'SET_ALERTS'; payload: Alerta[] }
  | { type: 'CLEAR_DATA' }
  // Undo/Redo
  | { type: 'UNDO' }
  | { type: 'REDO' }
  // BNCC
  | { type: 'CREATE_BNCC'; payload: { nome: string } }
  | { type: 'DELETE_BNCC'; payload: { bnccId: string } };

export type GridAction = 
  | { type: 'DRAG_START'; payload: DraggedItemInfo }
  | { type: 'DRAG_END' }
  | { type: 'SELECT_SLOT'; payload: { slotId: string | null } }
  | { type: 'COPY_SLOT'; payload: { sourceSlot: GradeSlot } }
  | { type: 'CUT_SLOT'; payload: { sourceSlot: GradeSlot } }
  | { type: 'PASTE_SLOT'; payload: { isCut: boolean } } 
  | { type: 'CLEAR_CLIPBOARD' };

export type UIAction = 
  | { type: 'SHOW_TOAST'; payload: string | null }
  | { type: 'SET_ONLINE_USERS'; payload: PresenceUser[] }
  | { type: 'SET_SAVE_STATUS'; payload: SaveStatus }
  | { type: 'TOGGLE_SIDEBAR'; payload?: boolean };