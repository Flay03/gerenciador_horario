

import { AppState, Alerta, AlertType, GradeSlot } from '../types';
import { DIAS_SEMANA } from '../constants';

// Helper to convert "HH:MM-HH:MM" to start/end minutes from day start
export const timeToMinutes = (time: string): { start: number; end: number } => {
  const [startStr, endStr] = time.split('-');
  const [startH, startM] = startStr.split(':').map(Number);
  const [endH, endM] = endStr.split(':').map(Number);
  return {
    start: startH * 60 + startM,
    end: endH * 60 + endM,
  };
};

export const validateState = (state: AppState): Alerta[] => {
  const alertas: Alerta[] = [];
  const { professores, grade, disciplinas, atribuicoes, turmas } = state;

  // Rule: Professor schedule conflict (same time, different classes)
  const professorSchedule: Record<string, GradeSlot[]> = {};
  grade.forEach(slot => {
      const key = `${slot.professorId}-${slot.dia}-${slot.horario}`;
      if (!professorSchedule[key]) {
          professorSchedule[key] = [];
      }
      professorSchedule[key].push(slot);
  });

  for (const key in professorSchedule) {
      if (professorSchedule[key].length > 1) {
          const conflictingSlots = professorSchedule[key];
          const professor = professores.find(p => p.id === conflictingSlots[0].professorId);
          const dia = conflictingSlots[0].dia;
          const horario = conflictingSlots[0].horario;

          alertas.push({
              id: `conflito-horario-${key}`,
              tipo: AlertType.ProfessorConflitoHorario,
              detalhes: `Alerta Crítico: Professor ${professor?.nome || 'Desconhecido'} está em ${conflictingSlots.length} lugares ao mesmo tempo na ${dia} às ${horario}.`,
              timestamp: Date.now(),
              gradeSlotIds: conflictingSlots.map(s => s.id),
          });
      }
  }

  // Rule: Swapped between classes
  grade.forEach(slot => {
    const originalDisciplina = state.disciplinas.find(d => d.id === slot.disciplinaId);
    if (originalDisciplina && originalDisciplina.turmaId !== slot.turmaId) {
      // It's a swap. A swap is valid (no alert) only if it's a BNCC discipline
      // moved to a target class where the same professor is assigned to the corresponding BNCC discipline.
      
      let isBnccSwapValid = false;
      if (originalDisciplina.bnccId) {
        const targetDisciplina = state.disciplinas.find(d => 
          d.turmaId === slot.turmaId && 
          d.bnccId === originalDisciplina.bnccId
        );

        if (targetDisciplina) {
          const targetAtribuicao = state.atribuicoes.find(a => a.disciplinaId === targetDisciplina.id);
          if (targetAtribuicao && targetAtribuicao.professores.includes(slot.professorId)) {
            isBnccSwapValid = true;
          }
        }
      }
      
      if (!isBnccSwapValid) {
        const turmaA = state.turmas.find(t=>t.id === originalDisciplina.turmaId)?.nome || `ID Inválido (${originalDisciplina.turmaId})`;
        const turmaB = state.turmas.find(t=>t.id === slot.turmaId)?.nome || `ID Inválido (${slot.turmaId})`;
        
        alertas.push({
          id: `turma-errada-${slot.id}`,
          tipo: AlertType.TurmaErrada,
          detalhes: `Disciplina ${originalDisciplina.nome} da turma ${turmaA} foi alocada na turma ${turmaB}.`,
          timestamp: Date.now(),
          gradeSlotIds: [slot.id],
        });
      }
    }
  });
  
  // Rule: Intersticio < 11h
  professores.forEach(prof => {
    const professorSlots = grade.filter(g => g.professorId === prof.id);
    const aulasPorDia: Record<string, { minStart: number, maxEnd: number }> = {};
    
    professorSlots.forEach(slot => {
        const { start, end } = timeToMinutes(slot.horario);
        if (!aulasPorDia[slot.dia]) {
            aulasPorDia[slot.dia] = { minStart: start, maxEnd: end };
        } else {
            aulasPorDia[slot.dia].minStart = Math.min(aulasPorDia[slot.dia].minStart, start);
            aulasPorDia[slot.dia].maxEnd = Math.max(aulasPorDia[slot.dia].maxEnd, end);
        }
    });

    for (let i = 0; i < DIAS_SEMANA.length - 1; i++) {
        const dia1 = DIAS_SEMANA[i];
        const dia2 = DIAS_SEMANA[i+1];

        if(aulasPorDia[dia1] && aulasPorDia[dia2]) {
            const fimDia1 = aulasPorDia[dia1].maxEnd;
            const inicioDia2 = aulasPorDia[dia2].minStart;
            const descanso = (24 * 60 - fimDia1) + inicioDia2;
            
            if (descanso < 11 * 60) {
                 const relevantSlots = professorSlots
                    .filter(s => s.dia === dia1 || s.dia === dia2)
                    .map(s => s.id);
                 alertas.push({
                    id: `intersticio-${prof.id}-${dia1}-${dia2}`,
                    tipo: AlertType.Intersticio,
                    detalhes: `Professor ${prof.nome} tem menos de 11h de descanso entre ${dia1} e ${dia2}.`,
                    timestamp: Date.now(),
                    gradeSlotIds: relevantSlots,
                });
            }
        }
    }
  });

  // Rule: Maximum 8 classes per day per professor
  professores.forEach(prof => {
    const aulasPorDia: Record<string, GradeSlot[]> = {};
    grade.filter(g => g.professorId === prof.id).forEach(g => {
      if (!aulasPorDia[g.dia]) aulasPorDia[g.dia] = [];
      aulasPorDia[g.dia].push(g);
    });

    for (const dia in aulasPorDia) {
      const totalAulasNoDia = aulasPorDia[dia].reduce((total, slot) => {
        const turma = turmas.find(t => t.id === slot.turmaId);
        const aulaValue = turma?.isModular ? 1.25 : 1;
        return total + aulaValue;
      }, 0);
      
      if (totalAulasNoDia > 8) {
        alertas.push({
          id: `max-aulas-${prof.id}-${dia}`,
          tipo: AlertType.MaxAulasDia,
          detalhes: `Professor ${prof.nome} tem o equivalente a ${totalAulasNoDia} aulas na ${dia}.`,
          timestamp: Date.now(),
          gradeSlotIds: aulasPorDia[dia].map(g => g.id),
        });
      }
    }
  });

  // Rule: Conflito de Disponibilidade em Disciplina Dividida
  grade.forEach(slot => {
      const disciplina = disciplinas.find(d => d.id === slot.disciplinaId);
      if (disciplina && disciplina.divisao) {
          const atribuicao = atribuicoes.find(a => a.disciplinaId === disciplina.id);
          if (atribuicao && atribuicao.professores.length > 1) {
              atribuicao.professores.forEach(profId => {
                  const professor = professores.find(p => p.id === profId);
                  if (professor) {
                      const diaDisponivel = professor.disponibilidade[slot.dia];
                      if (!diaDisponivel || !diaDisponivel.includes(slot.horario)) {
                          alertas.push({
                              id: `conflito-divisao-${slot.id}-${profId}`,
                              tipo: AlertType.ConflitoDisponibilidadeDivisao,
                              detalhes: `Conflito em disciplina dividida: ${disciplina.nome}. Professor ${professor.nome} está indisponível neste horário.`,
                              timestamp: Date.now(),
                              gradeSlotIds: [slot.id],
                          });
                      }
                  }
              });
          }
      }
  });
  
  // Rule: Class outside of availability
  grade.forEach(slot => {
    const professor = professores.find(p => p.id === slot.professorId);
    if (professor) {
      const diaDisponivel = professor.disponibilidade[slot.dia];
      if (!diaDisponivel || !diaDisponivel.includes(slot.horario)) {
        alertas.push({
          id: `indisponivel-${slot.id}`,
          tipo: AlertType.Indisponivel,
          detalhes: `Aula de ${disciplinas.find(d=>d.id===slot.disciplinaId)?.nome} para ${professor.nome} está fora de sua disponibilidade.`,
          timestamp: Date.now(),
          gradeSlotIds: [slot.id],
        });
      }
    }
  });

  // Remove duplicate alerts by ID
  const uniqueAlerts = Array.from(new Map(alertas.map(a => [a.id, a])).values());

  return uniqueAlerts;
};