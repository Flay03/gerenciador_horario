
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { DIAS_SEMANA, HORARIOS_MANHA, HORARIOS_TARDE, HORARIOS_NOITE_REGULAR, HORARIOS_NOITE_MODULAR } from '../../constants';
import GridCell from './GridCell';
import VisibilityControl, { VisibilityState } from './VisibilityControl';
import { Periodo, GridType, GradeSlot, Alerta } from '../../types';
import { timeToMinutes } from '../../services/validationService';


export interface ContextMenuItem {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}

interface ContextMenuProps {
  isOpen: boolean;
  onClose: () => void;
  x: number;
  y: number;
  items: ContextMenuItem[];
}

const ContextMenu: React.FC<ContextMenuProps> = ({ isOpen, onClose, x, y, items }) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);
  
  if (!isOpen) return null;

  return (
    <div
      ref={menuRef}
      className="absolute z-50 bg-white rounded-md shadow-lg border border-gray-200 py-1 w-32"
      style={{ top: y, left: x }}
    >
      <ul>
        {items.map((item, index) => (
          <li key={index}>
            <button
              onClick={() => {
                if (!item.disabled) {
                  item.onClick();
                  onClose();
                }
              }}
              disabled={item.disabled}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 disabled:text-gray-400 disabled:bg-white disabled:cursor-not-allowed"
            >
              {item.label}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

interface TimetableGridProps {
  isFocusModeEnabled: boolean;
  gridType: GridType;
}

const TimetableGrid: React.FC<TimetableGridProps> = ({ isFocusModeEnabled, gridType }) => {
  const { state, dispatch } = useData();
  const { ano, cursos, turmas: allTurmas, grade, clipboard, selectedSlotId, disciplinas, professores, draggedItem, atribuicoes, alertas } = state;
  const [zoom, setZoom] = useState(1);
  const [contextMenu, setContextMenu] = useState({ isOpen: false, x: 0, y: 0, slotId: '' });
  const [hoveredProfessorId, setHoveredProfessorId] = useState<string | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isEditingYear, setIsEditingYear] = useState(false);
  const [yearInput, setYearInput] = useState(ano.toString());

  const scaledDimensions = useMemo(() => {
    return {
      dayColWidth: 50 * zoom,
      timeColWidth: 80 * zoom,
      turmaColWidth: 150 * zoom,
      headerHeight: 44 * zoom, // from h-11 tailwind class
      cellMinHeight: 60 * zoom,
      daySeparatorHeight: 8 * zoom, // from h-2
      periodSeparatorHeight: 8 * zoom, // from h-2
      fontSizeHeader: 12 * zoom,
      fontSizeTurmaHeader: 11 * zoom,
      fontSizeTime: 12 * zoom,
      fontSizeCell: 12 * zoom,
      fontSizeYear: 18 * zoom,
      fontSizeYearLabel: 12 * zoom,
    };
  }, [zoom]);

  const turmas = useMemo(() => {
    const filtered = allTurmas.filter(t => t.isModular === (gridType === 'modular'));
    // Sort by course name, then turma name for consistent ordering
    return filtered.sort((a, b) => {
      const cursoA = cursos.find(c => c.id === a.cursoId)?.nome || '';
      const cursoB = cursos.find(c => c.id === b.cursoId)?.nome || '';
      if (cursoA.localeCompare(cursoB) !== 0) {
        return cursoA.localeCompare(cursoB);
      }
      return a.nome.localeCompare(b.nome);
    });
  }, [allTurmas, gridType, cursos]);

  useEffect(() => {
    setYearInput(ano.toString());
  }, [ano]);

  const handleYearSave = () => {
    const newYear = parseInt(yearInput, 10);
    // Basic validation for a reasonable year range
    if (!isNaN(newYear) && newYear > 2000 && newYear < 2100) {
      dispatch({ type: 'UPDATE_ANO', payload: newYear });
    } else {
      setYearInput(ano.toString()); // Reset to original if invalid
      dispatch({ type: 'SHOW_TOAST', payload: 'Ano inválido.' });
    }
    setIsEditingYear(false);
  };

  const handleYearKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur(); // Triggers onBlur which saves
    } else if (e.key === 'Escape') {
      setYearInput(ano.toString());
      setIsEditingYear(false);
    }
  };


  const [visibility, setVisibility] = useState<VisibilityState>({
    periods: { manha: true, tarde: true, noite: true },
    cursos: {},
    turmas: {},
  });

  useEffect(() => {
    setVisibility(prev => {
      const newCursos: Record<string, boolean> = {};
      cursos.forEach(c => {
        newCursos[c.id] = prev.cursos[c.id] ?? true;
      });
      const newTurmas: Record<string, boolean> = {};
      turmas.forEach(t => {
        newTurmas[t.id] = prev.turmas[t.id] ?? true;
      });
      return { ...prev, cursos: newCursos, turmas: newTurmas };
    });
  }, [cursos, turmas]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.target !== document.body) return;
    
    if (selectedSlotId) {
      if (e.ctrlKey) {
          if (e.key === 'c') {
              e.preventDefault();
              dispatch({ type: 'COPY_SLOT', payload: { sourceSlotId: selectedSlotId } });
          } else if (e.key === 'x') {
              e.preventDefault();
              dispatch({ type: 'CUT_SLOT', payload: { sourceSlotId: selectedSlotId } });
          } else if (e.key === 'v') {
              e.preventDefault();
              if (clipboard) {
                  const sourceTurma = allTurmas.find(t => t.id === clipboard.sourceSlot.turmaId);
                  const destTurmaId = selectedSlotId.split('_')[0];
                  const destTurma = allTurmas.find(t => t.id === destTurmaId);
                  
                  if (sourceTurma && destTurma && sourceTurma.isModular !== destTurma.isModular) {
                      dispatch({ type: 'SHOW_TOAST', payload: 'Não é permitido colar aulas entre a grade regular e a modular.' });
                      return; // Block the paste
                  }
              }
              dispatch({ type: 'PASTE_SLOT', payload: { destinationId: selectedSlotId } });
          }
      } else if (e.key === 'Delete') {
          e.preventDefault();
          dispatch({ type: 'DELETE_SLOT', payload: { slotId: selectedSlotId } });
      }
    }
  }, [selectedSlotId, dispatch, clipboard, allTurmas]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);


  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault();
        setZoom(prevZoom => Math.max(0.5, Math.min(2, prevZoom - e.deltaY * 0.001)));
      }
    };

    container.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      container.removeEventListener('wheel', handleWheel);
    };
  }, []);

  const handleGridDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    if (!draggedItem) return;

    const container = scrollContainerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const y = e.clientY - rect.top;

    const scrollThreshold = 60; // Pixels from the edge to trigger scroll
    const scrollSpeed = 10;     // How fast to scroll

    if (y < scrollThreshold) {
      // Scroll up
      container.scrollTop -= scrollSpeed;
    } else if (y > rect.height - scrollThreshold) {
      // Scroll down
      container.scrollTop += scrollSpeed;
    }
  };

  const handleCloseContextMenu = () => {
    setContextMenu({ ...contextMenu, isOpen: false });
  };

  const handleOpenContextMenu = (e: React.MouseEvent, slotId: string) => {
    e.preventDefault();
    e.stopPropagation();
    dispatch({ type: 'SELECT_SLOT', payload: { slotId } });
    setContextMenu({ isOpen: true, x: e.pageX, y: e.pageY, slotId });
  };
  
  const getContextMenuItems = (): ContextMenuItem[] => {
    const { slotId } = contextMenu;
    if (!slotId) return [];

    const isOccupied = grade.some(s => s.id === slotId);
    const canPaste = !!clipboard;

    const copyItem: ContextMenuItem = {
        label: 'Copiar',
        onClick: () => dispatch({ type: 'COPY_SLOT', payload: { sourceSlotId: slotId } }),
        disabled: !isOccupied
    };
    const cutItem: ContextMenuItem = {
        label: 'Recortar',
        onClick: () => dispatch({ type: 'CUT_SLOT', payload: { sourceSlotId: slotId } }),
        disabled: !isOccupied
    };
    const pasteItem: ContextMenuItem = {
        label: 'Colar',
        onClick: () => dispatch({ type: 'PASTE_SLOT', payload: { destinationId: slotId } }),
        disabled: !canPaste
    };

    return [copyItem, cutItem, pasteItem];
  };

  const handleSelectSlot = (slotId: string | null) => {
      dispatch({ type: 'SELECT_SLOT', payload: { slotId } });
  }

  const horariosNoite = useMemo(() => {
    return gridType === 'modular' ? HORARIOS_NOITE_MODULAR : HORARIOS_NOITE_REGULAR;
  }, [gridType]);

  const allHorariosForGrid = useMemo(() => {
    return [...HORARIOS_MANHA, ...HORARIOS_TARDE, ...horariosNoite];
  }, [horariosNoite]);

  const visibleHorarios = allHorariosForGrid.filter(horario => {
    if (HORARIOS_MANHA.includes(horario) && visibility.periods.manha) return true;
    if (HORARIOS_TARDE.includes(horario) && visibility.periods.tarde) return true;
    if (horariosNoite.includes(horario) && visibility.periods.noite) return true;
    return false;
  });

  const visibleTurmas = turmas.filter(turma => visibility.turmas[turma.id]);
  
  const sortedCursos = useMemo(() => [...cursos].sort((a,b) => a.nome.localeCompare(b.nome)), [cursos]);

  const turmasByCurso = sortedCursos
    .map(curso => ({
      ...curso,
      turmas: turmas.filter(t => t.cursoId === curso.id) // turmas is already sorted
    }))
    .filter(curso => visibility.cursos[curso.id]);

  const lastTurmaOfCourseIds = useMemo(() => {
    const ids = new Set<string>();
    visibleTurmas.forEach((turma, index) => {
      const nextTurma = visibleTurmas[index + 1];
      if (!nextTurma || nextTurma.cursoId !== turma.cursoId) {
        ids.add(turma.id);
      }
    });
    return ids;
  }, [visibleTurmas]);
    
  // --- Performance Optimizations: Memoized Maps for fast lookups ---
  const gradeMap = useMemo(() => {
    const map = new Map<string, GradeSlot[]>();
    grade.forEach(slot => {
        const baseId = `${slot.turmaId}_${slot.dia}_${slot.horario}`;
        if (!map.has(baseId)) {
            map.set(baseId, []);
        }
        map.get(baseId)!.push(slot);
    });
    return map;
  }, [grade]);

  const cellAlertsMap = useMemo(() => {
    const map = new Map<string, Alerta[]>();
    alertas.forEach(alerta => {
        alerta.gradeSlotIds.forEach(slotId => {
            if (!map.has(slotId)) {
                map.set(slotId, []);
            }
            map.get(slotId)!.push(alerta);
        });
    });
    return map;
  }, [alertas]);

  const validMoveHighlights = useMemo(() => {
    // 1. Determine the source of the drag/selection
    let sourceInfo: { professorId: string; disciplinaId: string; slotIdToIgnore: string | null } | null = null;
    
    if (draggedItem?.type === 'SIDEBAR_ITEM' && draggedItem.disciplinaId && draggedItem.professorId) {
        sourceInfo = {
            professorId: draggedItem.professorId,
            disciplinaId: draggedItem.disciplinaId,
            slotIdToIgnore: null
        };
    } else {
        const sourceSlotId = selectedSlotId || (draggedItem?.type === 'GRID_ITEM' ? draggedItem.sourceSlotId : null);
        if (sourceSlotId) {
            const sourceSlot = grade.find(s => s.id === sourceSlotId);
            if (sourceSlot) {
                sourceInfo = {
                    professorId: sourceSlot.professorId,
                    disciplinaId: sourceSlot.disciplinaId,
                    slotIdToIgnore: sourceSlotId
                };
            }
        }
    }
    
    if (!sourceInfo) return {};

    const { professorId: sourceProfessorId, disciplinaId: sourceDisciplinaId, slotIdToIgnore } = sourceInfo;
    
    const sourceProfessor = professores.find(p => p.id === sourceProfessorId);
    if (!sourceProfessor) return {};

    const sourceDisciplina = disciplinas.find(d => d.id === sourceDisciplinaId);
    if (!sourceDisciplina) return {};
    
    const gradeByCell = new Map<string, GradeSlot[]>();
    grade.forEach(slot => {
        const baseId = `${slot.turmaId}_${slot.dia}_${slot.horario}`;
        if (!gradeByCell.has(baseId)) {
            gradeByCell.set(baseId, []);
        }
        gradeByCell.get(baseId)!.push(slot);
    });

    const targetTurmas = [];
    if (sourceDisciplina.bnccId) {
        const validTargetTurmaIds = new Set<string>();
        disciplinas.forEach(disc => {
            if (disc.bnccId === sourceDisciplina.bnccId) {
                 const atribuicao = atribuicoes.find(a => a.disciplinaId === disc.id);
                 if (atribuicao && atribuicao.professores.includes(sourceProfessorId)) {
                     validTargetTurmaIds.add(disc.turmaId);
                 }
            }
        });
        targetTurmas.push(...visibleTurmas.filter(t => validTargetTurmaIds.has(t.id)));
    } else {
        const sourceTurma = visibleTurmas.find(t => t.id === sourceDisciplina.turmaId);
        if (sourceTurma) {
            targetTurmas.push(sourceTurma);
        }
    }
    
    const professorSchedule: Record<string, Set<string>> = {};
    const professorDailyCounts: Record<string, number> = {};
    const professorDailyBounds: Record<string, { minStart: number, maxEnd: number }> = {};

    grade.forEach(slot => {
        if (slot.professorId !== sourceProfessorId || (slotIdToIgnore && slot.id === slotIdToIgnore)) return;

        if (!professorSchedule[slot.dia]) professorSchedule[slot.dia] = new Set();
        professorSchedule[slot.dia].add(slot.horario);

        const turma = allTurmas.find(t => t.id === slot.turmaId);
        const aulaValue = turma?.isModular ? 1.25 : 1;
        professorDailyCounts[slot.dia] = (professorDailyCounts[slot.dia] || 0) + aulaValue;

        const { start, end } = timeToMinutes(slot.horario);
        const currentBounds = professorDailyBounds[slot.dia];
        if (!currentBounds) {
            professorDailyBounds[slot.dia] = { minStart: start, maxEnd: end };
        } else {
            currentBounds.minStart = Math.min(currentBounds.minStart, start);
            currentBounds.maxEnd = Math.max(currentBounds.maxEnd, end);
        }
    });

    const highlights: Record<string, 'valid' | 'warning'> = {};

    targetTurmas.forEach(turma => {
        DIAS_SEMANA.forEach(dia => {
            visibleHorarios.forEach(horario => {
                const baseId = `${turma.id}_${dia}_${horario}`;
                
                const allSlotsInCell = gradeByCell.get(baseId) || [];
                const slotsInCell = allSlotsInCell.filter(s => !slotIdToIgnore || s.id !== slotIdToIgnore);

                const potentialTargets: string[] = [];
                if (sourceDisciplina.divisao) {
                    if (!slotsInCell.some(s => s.id === `${baseId}-0`)) potentialTargets.push(`${baseId}-0`);
                    if (!slotsInCell.some(s => s.id === `${baseId}-1`)) potentialTargets.push(`${baseId}-1`);
                } else {
                    if (slotsInCell.length === 0) potentialTargets.push(baseId);
                }

                potentialTargets.forEach(destinationId => {
                    let isHardFail = false;
                    let isWarning = false;

                    if (!sourceProfessor.disponibilidade[dia]?.includes(horario)) {
                        isWarning = true;
                    }

                    if (!isHardFail && professorSchedule[dia]?.has(horario)) {
                        isHardFail = true;
                    }

                    const targetTurma = allTurmas.find(t => t.id === turma.id);
                    const aulaValue = targetTurma?.isModular ? 1.25 : 1;
                    if (!isHardFail && (professorDailyCounts[dia] || 0) + aulaValue > 8) {
                        isHardFail = true;
                    }

                    if (!isHardFail) {
                        const { start: destStart, end: destEnd } = timeToMinutes(horario);
                        const prevDayIndex = DIAS_SEMANA.indexOf(dia) - 1;
                        if (prevDayIndex >= 0) {
                            const prevDay = DIAS_SEMANA[prevDayIndex];
                            const prevDayBounds = professorDailyBounds[prevDay];
                            if (prevDayBounds && (24 * 60 - prevDayBounds.maxEnd) + destStart < 11 * 60) {
                                isHardFail = true;
                            }
                        }

                        if (!isHardFail) {
                            const nextDayIndex = DIAS_SEMANA.indexOf(dia) + 1;
                            if (nextDayIndex < DIAS_SEMANA.length) {
                                const nextDay = DIAS_SEMANA[nextDayIndex];
                                const nextDayBounds = professorDailyBounds[nextDay];
                                if (nextDayBounds && (24 * 60 - destEnd) + nextDayBounds.minStart < 11 * 60) {
                                    isHardFail = true;
                                }
                            }
                        }
                    }

                    if (!isHardFail) {
                        highlights[destinationId] = isWarning ? 'warning' : 'valid';
                    }
                });
            });
        });
    });

    return highlights;
  }, [selectedSlotId, draggedItem, grade, disciplinas, allTurmas, professores, visibleTurmas, visibleHorarios, atribuicoes]);


  return (
    <div 
        ref={scrollContainerRef}
        className="flex-1 overflow-auto bg-gray-200 p-4" 
        onClick={() => { handleCloseContextMenu(); handleSelectSlot(null); }}
        onDragOver={handleGridDragOver}
    >
      <VisibilityControl 
        visibility={visibility}
        onVisibilityChange={setVisibility}
        cursos={cursos}
        turmas={turmas}
      />
      <div
        style={{
          display: 'inline-block',
        }}
        onMouseLeave={() => setHoveredProfessorId(null)}
      >
        <div className="relative grid" style={{ gridTemplateColumns: `${scaledDimensions.dayColWidth}px ${scaledDimensions.timeColWidth}px repeat(${visibleTurmas.length}, ${scaledDimensions.turmaColWidth}px)` }}>
          {/* Top-left corner */}
          <div
            className="sticky top-0 left-0 z-40 bg-slate-200 border-b-2 border-r border-slate-300 flex items-center justify-center p-1"
            style={{gridColumn: '1 / span 2', gridRow: '1 / span 2'}}
          >
            {isEditingYear ? (
              <div className="flex flex-col items-center">
                <label htmlFor="year-input" className="text-xs text-slate-600 mb-1">Ano</label>
                <input
                  id="year-input"
                  type="number"
                  value={yearInput}
                  onChange={(e) => setYearInput(e.target.value)}
                  onBlur={handleYearSave}
                  onKeyDown={handleYearKeyDown}
                  className="w-20 text-center bg-white rounded border-2 border-indigo-500 shadow-inner"
                  autoFocus
                  onFocus={(e) => e.target.select()}
                />
              </div>
            ) : (
              <div onClick={() => setIsEditingYear(true)} className="p-2 cursor-pointer text-center text-slate-700 hover:bg-slate-300 rounded-md">
                <div className="font-bold" style={{ fontSize: `${scaledDimensions.fontSizeYear}px` }}>{ano}</div>
                <div className="text-xs font-semibold uppercase tracking-wider" style={{ fontSize: `${scaledDimensions.fontSizeYearLabel}px` }}>Ano</div>
              </div>
            )}
          </div>
          
          {/* Course Headers */}
          {turmasByCurso.map(curso => {
            const visibleTurmasForCurso = curso.turmas.filter(t => visibility.turmas[t.id]);
            if (visibleTurmasForCurso.length === 0) return null;

            const firstVisibleTurmaOfCurso = visibleTurmasForCurso[0];
            const startColumn = visibleTurmas.findIndex(t => t.id === firstVisibleTurmaOfCurso.id) + 3;
            
            return (
              <div
                key={curso.id}
                className="sticky top-0 z-30 bg-slate-200 text-slate-800 flex items-center justify-center font-bold p-2 uppercase tracking-wider border-b-2 border-slate-300"
                style={{ 
                    gridColumn: `${startColumn} / span ${visibleTurmasForCurso.length}`,
                    height: `${scaledDimensions.headerHeight}px`,
                    fontSize: `${scaledDimensions.fontSizeHeader}px` 
                }}
              >
                <span className="truncate" title={curso.nome}>{curso.nome}</span>
              </div>
            );
          })}
          
          {/* Turma Headers */}
          {visibleTurmas.map((turma, index) => (
            <div key={turma.id} className={`sticky z-20 bg-slate-100 text-slate-600 flex items-center justify-center font-semibold p-2 border-b border-slate-300 ${lastTurmaOfCourseIds.has(turma.id) ? 'border-r-2 border-r-slate-400' : 'border-r border-slate-300'}`} style={{
                gridColumn: index + 3,
                top: `${scaledDimensions.headerHeight}px`,
                height: `${scaledDimensions.headerHeight}px`,
                fontSize: `${scaledDimensions.fontSizeTurmaHeader}px`
            }}>
              {turma.nome}
            </div>
          ))}

          {/* Day, Time, and Grid Cells */}
          {DIAS_SEMANA.map((dia, diaIndex) => {
            if (visibleHorarios.length === 0) return null;

            const isLastDay = diaIndex === DIAS_SEMANA.length - 1;
            const periodSeparators = visibleHorarios.filter((horario, horarioIndex) => {
                if (horarioIndex === visibleHorarios.length - 1) return false;
                const isEndOfManha = HORARIOS_MANHA[HORARIOS_MANHA.length - 1] === horario;
                const isEndOfTarde = HORARIOS_TARDE[HORARIOS_TARDE.length - 1] === horario;
                return isEndOfManha || isEndOfTarde;
            });
            const dayContentRows = visibleHorarios.length + periodSeparators.length;
            
            const dayTimeSlotsAndSeparators = visibleHorarios.flatMap((horario, horarioIndex) => {
                const isEndOfManha = HORARIOS_MANHA[HORARIOS_MANHA.length - 1] === horario;
                const isEndOfTarde = HORARIOS_TARDE[HORARIOS_TARDE.length - 1] === horario;
                const isEndOfPeriod = isEndOfManha || isEndOfTarde;
                const isLastHorarioOfDay = horarioIndex === visibleHorarios.length - 1;

                const borderClass = 'border-b border-slate-300';
                
                const timeHeaderClasses = `sticky z-20 bg-slate-50 p-1 text-center border-r border-slate-300 flex items-center justify-center ${borderClass}`;

                const rowElements = [
                    // Time Header Column
                    <div key={`${dia}_${horario}_time`} className={timeHeaderClasses} style={{ left: `${scaledDimensions.dayColWidth}px`, fontSize: `${scaledDimensions.fontSizeTime}px` }}>
                        {horario}
                    </div>,
                    // Grid Cells for this row
                    ...visibleTurmas.map(turma => {
                        const id = `${turma.id}_${dia}_${horario}`;
                        const slotsInCell = gradeMap.get(id) || [];
                        const fullSlot = slotsInCell.find(s => !(s.id.endsWith('-0') || s.id.endsWith('-1')));
                        const slot0 = slotsInCell.find(s => s.id.endsWith('-0'));
                        const slot1 = slotsInCell.find(s => s.id.endsWith('-1'));
                        return <GridCell 
                                key={id} 
                                id={id}
                                gridType={gridType} 
                                turma={turma}
                                fullSlot={fullSlot}
                                slot0={slot0}
                                slot1={slot1}
                                isLastInCourse={lastTurmaOfCourseIds.has(turma.id)}
                                onOpenContextMenu={handleOpenContextMenu} 
                                onSelectSlot={handleSelectSlot} 
                                selectedSlotId={selectedSlotId || null}
                                hoveredProfessorId={isFocusModeEnabled ? hoveredProfessorId : null}
                                onProfessorHover={isFocusModeEnabled ? setHoveredProfessorId : () => {}}
                                highlightStatus={validMoveHighlights[id] || null}
                                cellAlerts={cellAlertsMap.get(id) || []}
                                subCellAlerts0={cellAlertsMap.get(`${id}-0`) || []}
                                subCellAlerts1={cellAlertsMap.get(`${id}-1`) || []}
                                subSlotHighlightStatus={{
                                    '0': validMoveHighlights[`${id}-0`] || null,
                                    '1': validMoveHighlights[`${id}-1`] || null,
                                }}
                                scaledCellMinHeight={scaledDimensions.cellMinHeight}
                                scaledCellFontSize={scaledDimensions.fontSizeCell}
                                />;
                    })
                ];

                const elementsToReturn = [...rowElements];

                if (isEndOfPeriod && !isLastHorarioOfDay) {
                    const separatorElement = <div 
                        key={`${dia}_${horario}_separator`}
                        style={{ 
                            gridColumn: `2 / span ${1 + visibleTurmas.length}`,
                            height: `${scaledDimensions.periodSeparatorHeight}px`
                        }} 
                    />;
                    elementsToReturn.push(separatorElement);
                }

                return elementsToReturn;
            });

            return (
              <React.Fragment key={dia}>
                  {/* Day Header Column: Spans content rows */}
                  <div
                      className={`sticky left-0 z-30 bg-slate-200 py-2 text-center font-semibold border-r-2 border-slate-300 flex items-center justify-center capitalize [writing-mode:vertical-rl] rotate-180`}
                      style={{ gridRow: `span ${dayContentRows}`, fontSize: `${scaledDimensions.fontSizeHeader}px` }}
                  >
                      {dia}
                  </div>
                  
                  <div style={{ display: 'contents' }}>
                    {dayTimeSlotsAndSeparators}
                  </div>
                  
                  {/* Day Separator Row */}
                  {!isLastDay && (
                    <React.Fragment>
                      <div
                        className="sticky left-0 z-30 bg-slate-300 border-b-2 border-r-2 border-slate-300"
                        style={{ gridColumn: '1', height: `${scaledDimensions.daySeparatorHeight}px` }}
                      />
                      <div
                        className="bg-slate-300 border-b-2 border-slate-300"
                        style={{ gridColumn: `2 / span ${1 + visibleTurmas.length}`, height: `${scaledDimensions.daySeparatorHeight}px` }}
                      />
                    </React.Fragment>
                  )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
      <ContextMenu 
        isOpen={contextMenu.isOpen}
        onClose={handleCloseContextMenu}
        x={contextMenu.x}
        y={contextMenu.y}
        items={getContextMenuItems()}
      />
    </div>
  );
};

export default TimetableGrid;
