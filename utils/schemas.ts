import { z } from 'zod';

// Basic ID Schema
export const IdSchema = z.string().min(1);

// Periodo Enum
export const PeriodoSchema = z.enum(['manha', 'tarde', 'noite']);

// Curso Schema
export const CursoSchema = z.object({
  id: IdSchema,
  nome: z.string().min(1).max(100),
});

// Turma Schema
export const TurmaSchema = z.object({
  id: IdSchema,
  cursoId: IdSchema,
  nome: z.string().min(1).max(50),
  periodo: PeriodoSchema,
  isModular: z.boolean(),
});

// Disciplina Schema
export const DisciplinaSchema = z.object({
  id: IdSchema,
  turmaId: IdSchema,
  nome: z.string().min(1).max(100),
  divisao: z.boolean(),
  numProfessores: z.number().min(1).max(5),
  aulasSemanais: z.number().min(0.25).max(20),
  bnccId: z.string().optional(),
});

// Professor Schema
export const ProfessorSchema = z.object({
  id: IdSchema,
  nome: z.string().min(1).max(255),
  disponibilidade: z.record(z.array(z.string())), // Key: Day, Value: Array of Time Slots
});

// Atribuicao Schema
export const AtribuicaoSchema = z.object({
  disciplinaId: IdSchema,
  professores: z.array(IdSchema),
});

// GradeSlot Schema
export const GradeSlotSchema = z.object({
  id: IdSchema,
  turmaId: IdSchema,
  dia: z.string(),
  horario: z.string(),
  disciplinaId: IdSchema,
  professorId: IdSchema,
});

// BNCC Schema
export const BnccSchema = z.object({
  id: IdSchema,
  nome: z.string(),
});

// App State Schema (Data Only)
export const AppDataSchema = z.object({
  version: z.string(),
  ano: z.number(),
  cursos: z.array(CursoSchema),
  turmas: z.array(TurmaSchema),
  disciplinas: z.array(DisciplinaSchema),
  professores: z.array(ProfessorSchema),
  atribuicoes: z.array(AtribuicaoSchema),
  grade: z.array(GradeSlotSchema),
  bncc: z.array(BnccSchema),
  lastModifiedBy: z.string().nullable(),
  lastModifiedAt: z.string().nullable(),
});