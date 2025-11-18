
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

  // --- Pre-compute Maps for O(1) Lookups ---
  const profMap = new Map(professores.map(p => [p.id, p]));
  const discMap = new Map(disciplinas.map(d => [d.id, d]));
  const turmaMap = new Map(turmas.map(t => [t.id, t]));
  const atribMap = new Map(atribuicoes.map(a => [a.disciplinaId, a]));
  
  // Indices for validation rules
  const slotsByProf = new Map<string, GradeSlot[]>();
  const slotsByTime = new Map<string, GradeSlot[]>(); // Key: `${professorId}-${dia}-${horario}`

  grade.forEach(slot => {
      // Index by Professor
      if (!slotsByProf.has(slot.professorId)) {
          slotsByProf.set(slot.professorId, []);
      }
      slotsByProf.get(slot.professorId)!.push(slot);

      // Index by Time for Conflict Detection
      const timeKey = `${slot.professorId}-${slot.dia}-${slot.horario}`;
      if (!slotsByTime.has(timeKey)) {
          slotsByTime.set(timeKey, []);
      }
      slotsByTime.get(timeKey)!.push(slot);
  });

  // --- Rule 1: Professor schedule conflict (same time, different classes) ---
  slotsByTime.forEach((conflictingSlots, key) => {
      if (conflictingSlots.length > 1) {
          const professor = profMap.get(conflictingSlots[0].professorId);
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
  });

  // --- Rule 2: Swapped between classes (Iterate Grade O(N)) ---
  grade.forEach(slot => {
    const originalDisciplina = discMap.get(slot.disciplinaId);
    if (originalDisciplina && originalDisciplina.turmaId !== slot.turmaId) {
      // It's a swap. Check if valid BNCC swap.
      let isBnccSwapValid = false;
      if (originalDisciplina.bnccId) {
        // Find if there is a discipline in the TARGET turma with the same BNCC ID
        // AND if the current professor is assigned to that target discipline.
        
        // Optimization: We need to find a specific discipline in the target turma.
        // Instead of filtering all disciplines, we iterate the known disciplines of the target turma? 
        // Since we don't have a `disciplinasByTurma` map, we do a quick search on `disciplinas`. 
        // Given typical array sizes, a simple find here is acceptable, or we could optimize further if needed.
        // For O(1), we would need a Map<`${turmaId}-${bnccId}`, Disciplina>.
        
        const targetDisciplina = disciplinas.find(d => 
            d.turmaId === slot.turmaId && 
            d.bnccId === originalDisciplina.bnccId
        );

        if (targetDisciplina) {
            const targetAtribuicao = atribMap.get(targetDisciplina.id);
            if (targetAtribuicao && targetAtribuicao.professores.includes(slot.professorId)) {
                isBnccSwapValid = true;
            }
        }
      }
      
      if (!isBnccSwapValid) {
        const turmaA = turmaMap.get(originalDisciplina.turmaId)?.nome || `ID Inválido (${originalDisciplina.turmaId})`;
        const turmaB = turmaMap.get(slot.turmaId)?.nome || `ID Inválido (${slot.turmaId})`;
        
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
  
  // --- Rules 3 & 4: Intersticio & Max Aulas (Iterate Professors O(P)) ---
  professores.forEach(prof => {
    const professorSlots = slotsByProf.get(prof.id) || [];
    if (professorSlots.length === 0) return;

    const aulasPorDia: Record<string, { minStart: number, maxEnd: number, count: number }> = {};
    
    professorSlots.forEach(slot => {
        const { start, end } = timeToMinutes(slot.horario);
        const turma = turmaMap.get(slot.turmaId);
        const aulaValue = turma?.isModular ? 1.25 : 1;

        if (!aulasPorDia[slot.dia]) {
            aulasPorDia[slot.dia] = { minStart: start, maxEnd: end, count: aulaValue };
        } else {
            aulasPorDia[slot.dia].minStart = Math.min(aulasPorDia[slot.dia].minStart, start);
            aulasPorDia[slot.dia].maxEnd = Math.max(aulasPorDia[slot.dia].maxEnd, end);
            aulasPorDia[slot.dia].count += aulaValue;
        }
    });

    // Rule 3: Intersticio
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

    // Rule 4: Max Aulas
    for (const dia in aulasPorDia) {
        if (aulasPorDia[dia].count > 8) {
             const slotsDoDia = professorSlots.filter(s => s.dia === dia).map(s => s.id);
             alertas.push({
                id: `max-aulas-${prof.id}-${dia}`,
                tipo: AlertType.MaxAulasDia,
                detalhes: `Professor ${prof.nome} tem o equivalente a ${aulasPorDia[dia].count} aulas na ${dia}.`,
                timestamp: Date.now(),
                gradeSlotIds: slotsDoDia,
             });
        }
    }
  });

  // --- Rule 5 & 6: Conflito Divisão & Availability (Iterate Grade O(N)) ---
  grade.forEach(slot => {
      // Rule 5: Conflito Disponibilidade Divisão
      const disciplina = discMap.get(slot.disciplinaId);
      if (disciplina && disciplina.divisao) {
          const atribuicao = atribMap.get(disciplina.id);
          if (atribuicao && atribuicao.professores.length > 1) {
              atribuicao.professores.forEach(profId => {
                  const professor = profMap.get(profId);
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

      // Rule 6: Class outside of availability
      const professor = profMap.get(slot.professorId);
      if (professor) {
        const diaDisponivel = professor.disponibilidade[slot.dia];
        if (!diaDisponivel || !diaDisponivel.includes(slot.horario)) {
            alertas.push({
                id: `indisponivel-${slot.id}`,
                tipo: AlertType.Indisponivel,
                detalhes: `Aula de ${disciplina?.nome || 'Desconhecida'} para ${professor.nome} está fora de sua disponibilidade.`,
                timestamp: Date.now(),
                gradeSlotIds: [slot.id],
            });
        }
      }
  });

  // Remove duplicate alerts by ID (though with precise IDs above, dups should be rare)
  const uniqueAlerts = Array.from(new Map(alertas.map(a => [a.id, a])).values());

  return uniqueAlerts;
};
