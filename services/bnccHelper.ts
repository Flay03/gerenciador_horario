import { AppState, GradeSlot, Disciplina } from '../types';

/**
 * Resolves the correct discipline for a given grade slot, accounting for valid BNCC swaps.
 * If a class is moved to a different turma that shares the same BNCC discipline,
 * this function returns the discipline ID of the target turma.
 * Otherwise, it returns the original discipline ID.
 *
 * @param slot The GradeSlot to resolve.
 * @param state The entire application state.
 * @returns An object containing the final resolved disciplineId and whether a swap occurred.
 */
export const resolveBnccDiscipline = (
  slot: GradeSlot,
  state: AppState
): { finalDisciplinaId: string; isSwap: boolean } => {
  const { disciplinas } = state;

  const originalDisciplina = disciplinas.find(d => d.id === slot.disciplinaId);

  // If there's no original discipline, something is wrong with the data.
  // Return the original ID to avoid breaking things further.
  if (!originalDisciplina) {
    return { finalDisciplinaId: slot.disciplinaId, isSwap: false };
  }

  const isSwap = originalDisciplina.turmaId !== slot.turmaId;

  // If it's not a swap, no resolution needed.
  if (!isSwap) {
    return { finalDisciplinaId: slot.disciplinaId, isSwap: false };
  }

  // It's a swap. Check if it's a valid BNCC swap.
  const isBncc = !!originalDisciplina.bnccId;

  if (isBncc) {
    const targetDisciplina = disciplinas.find(
      d => d.turmaId === slot.turmaId && d.bnccId === originalDisciplina.bnccId
    );

    // If a matching BNCC discipline exists in the target turma, resolve to its ID.
    if (targetDisciplina) {
      return { finalDisciplinaId: targetDisciplina.id, isSwap: true };
    }
  }

  // If it's a swap but not a valid BNCC one, return the original ID.
  return { finalDisciplinaId: slot.disciplinaId, isSwap: true };
};
