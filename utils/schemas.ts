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
  // Alteração crítica: Aceita z.any() nos valores para não falhar a validação de tipo inicial
  // e usa .transform para converter strings ou nulos em arrays de string.
  disponibilidade: z.record(z.string(), z.any()).transform((val) => {
      if (!val || typeof val !== 'object') return {};
      
      const clean: Record<string, string[]> = {};
      Object.keys(val).forEach((key) => {
          const value = val[key];
          if (Array.isArray(value)) {
              clean[key] = value.map(String);
          } else if (typeof value === 'string') {
              // Recupera casos onde o horário foi salvo como string única
              clean[key] = [value];
          } else {
              // Se for nulo, undefined ou número estranho
              clean[key] = [];
          }
      });
      return clean;
  }), 
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