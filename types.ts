

export type Periodo = 'manha' | 'tarde' | 'noite';
export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';
export type GridType = 'regular' | 'modular';

export interface Curso {
  id: string;
  nome: string;
}

export interface Turma {
  id: string;
  cursoId: string;
  nome: string;
  periodo: Periodo;
  isModular: boolean;
}

export interface Disciplina {
  id: string;
  turmaId: string;
  nome: string;
  divisao: boolean;
  numProfessores: number;
  aulasSemanais: number;
  bnccId?: string;
}

export interface Professor {
  id: string;
  nome: string;
  disponibilidade: Record<string, string[]>; // e.g., { "segunda": ["07:10-08:00"] }
}

export interface Atribuicao {
  disciplinaId: string;
  professores: string[]; // Array of professor IDs
}

export interface GradeSlot {
  id: string; // Unique ID for the slot, e.g., `${turmaId}_${dia}_${horario}`
  turmaId: string;
  dia: string;
  horario: string;
  disciplinaId: string;
  professorId: string;
}

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

export interface Bncc {
  id: string;
  nome: string;
}

export interface PresenceUser {
    id: string;
    name: string;
    email: string;
}

export interface AppState {
  version: string;
  ano: number;
  cursos: Curso[];
  turmas: Turma[];
  disciplinas: Disciplina[];
  professores: Professor[];
  atribuicoes: Atribuicao[];
  grade: GradeSlot[];
  alertas: Alerta[];
  bncc: Bncc[];
  toastMessage?: string | null;
  draggedItem?: DraggedItemInfo | null;
  clipboard?: ClipboardItem | null;
  selectedSlotId?: string | null;
  onlineUsers: PresenceUser[];
  saveStatus: SaveStatus;
  lastModifiedBy: string | null;
  lastModifiedAt: string | null;
}

export type Action =
  | { type: 'SET_STATE'; payload: AppState }
  // Grade
  | { type: 'UPDATE_GRADE'; payload: { slot: GradeSlot | null; id: string } }
  | { type: 'SWAP_GRADE_SLOTS'; payload: { sourceId: string; destinationId: string } }
  | { type: 'DELETE_SLOT'; payload: { slotId: string } }
  | { type: 'POPULATE_GRADE'; payload: GradeSlot[] }
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
  // UI
  | { type: 'SHOW_TOAST'; payload: string | null }
  | { type: 'CLEAR_DATA' }
  | { type: 'SELECT_SLOT'; payload: { slotId: string | null } }
  // Drag & Drop
  | { type: 'DRAG_START'; payload: DraggedItemInfo }
  | { type: 'DRAG_END' }
  // BNCC
  | { type: 'CREATE_BNCC'; payload: { nome: string } }
  | { type: 'DELETE_BNCC'; payload: { bnccId: string } }
  // Undo/Redo
  | { type: 'UNDO' }
  | { type: 'REDO' }
  // Clipboard
  | { type: 'COPY_SLOT'; payload: { sourceSlotId: string } }
  | { type: 'CUT_SLOT'; payload: { sourceSlotId: string } }
  | { type: 'PASTE_SLOT'; payload: { destinationId: string } }
  // Presence
  | { type: 'SET_ONLINE_USERS', payload: PresenceUser[] }
  // Save Status
  | { type: 'SET_SAVE_STATUS', payload: SaveStatus };