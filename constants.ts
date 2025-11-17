import { AlertType } from './types';

export const DIAS_SEMANA = ["segunda", "terca", "quarta", "quinta", "sexta"];

export const HORARIOS_MANHA = [
  "07:10-08:00", "08:00-08:50", "08:50-09:40", "10:00-10:50", "10:50-11:40", "11:40-12:30",
];
export const HORARIOS_TARDE = [
  "13:30-14:20", "14:20-15:10", "15:10-16:00", "16:20-17:10", "17:10-18:00", "18:00-18:50"
];
export const HORARIOS_NOITE_REGULAR = [
  "18:10-19:00", "19:00-19:50", "19:50-20:50", "21:05-21:55", "21:55-23:00"
];
export const HORARIOS_NOITE_MODULAR: string[] = [
  "18:10-19:00", "19:00-19:50", "19:50-20:50", "21:05-21:55", "21:55-23:00"
];

export const LOCAL_STORAGE_KEY = 'grade_v1_data';

export const ALERT_COLORS: Record<AlertType, { bg: string; text: string; name: string, description: string }> = {
  [AlertType.ProfessorConflitoHorario]: { 
    bg: 'bg-pink-600', 
    text: 'text-white', 
    name: 'Conflito de Horário (Professor)',
    description: 'Alerta Crítico: Professor alocado em múltiplas turmas no mesmo horário.'
  },
  [AlertType.TurmaErrada]: { 
    bg: 'bg-blue-500', 
    text: 'text-white', 
    name: 'Troca entre Turmas',
    description: 'Disciplina alocada em uma turma diferente da original (e não é uma troca BNCC válida).'
  },
  [AlertType.Intersticio]: { 
    bg: 'bg-red-600', 
    text: 'text-white', 
    name: 'Interstício < 11h',
    description: 'Menos de 11 horas de descanso entre os dias de trabalho.'
  },
  [AlertType.MaxAulasDia]: { 
    bg: 'bg-orange-400', 
    text: 'text-white', 
    name: 'Excesso de Aulas',
    description: 'Professor com mais de 8 aulas no dia.'
  },
  [AlertType.ConflitoDisponibilidadeDivisao]: {
    bg: 'bg-purple-500', 
    text: 'text-white', 
    name: 'Conflito Divisão',
    description: 'Professores de disciplina dividida com disponibilidades conflitantes no mesmo horário.'
  },
  [AlertType.Indisponivel]: { 
    bg: 'bg-yellow-400', 
    text: 'text-gray-800', 
    name: 'Fora de Disponibilidade',
    description: 'Aula alocada em horário indisponível para o professor.'
  },
};