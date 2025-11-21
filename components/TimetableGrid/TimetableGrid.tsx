
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { useGrid } from '../../context/GridContext';
import { useUI } from '../../context/UIContext';
import { DIAS_SEMANA, HORARIOS_MANHA, HORARIOS_TARDE, HORARIOS_NOITE_REGULAR, HORARIOS_NOITE_MODULAR } from '../../constants';
import GridCell from './GridCell';
import VisibilityControl, { VisibilityState } from './VisibilityControl';
import { GridType, Alerta, GradeSlot } from '../../types';
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

const EMPTY_ALERTS: Alerta[] = [];

const TimetableGrid: React.FC<TimetableGridProps> = ({ isFocusModeEnabled, gridType }) => {
  const { state: dataState, dispatch: dataDispatch } = useData();
  const { state: gridState, dispatch: gridDispatch } = useGrid();
  const { dispatch: uiDispatch } = useUI();

  const { ano, cursos, turmas: allTurmas, grade, disciplinas, professores, atribuicoes, alertas } = dataState;
  const { clipboard, selectedSlotId, draggedItem } = gridState;
  
  const [zoom, setZoom] = useState(() => {
    const savedZoom = localStorage.getItem('grid_zoom');
    return savedZoom ? parseFloat(savedZoom) : 1;
  });

  const [visibility, setVisibility] = useState<VisibilityState>(() => {
      const savedVisibility = localStorage.getItem('grid_visibility');
      if (savedVisibility) {
          try {
              const parsed = JSON.parse(savedVisibility);
              return {
                  periods: parsed.periods || { manha: true, tarde: true, noite: true },
                  cursos: {},
                  turmas: {}
              };
          } catch (e) {
              console.error("Error parsing saved visibility", e);
          }
      }
      return {
        periods: { manha: true, tarde: true, noite: true },
        cursos: {},
        turmas: {},
      };
  });

  const [contextMenu, setContextMenu] = useState({ isOpen: false, x: 0, y: 0, slotId: '' });
  const [hoveredProfessorId, setHoveredProfessorId] = useState<string | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isEditingYear, setIsEditingYear] = useState(false);
  const [yearInput, setYearInput] = useState(ano.toString());

  useEffect(() => {
    localStorage.setItem('grid_zoom', zoom.toString());
  }, [zoom]);

  const scaledDimensions = useMemo(() => {
    return {
      dayColWidth: 50 * zoom,
      timeColWidth: 80 * zoom,
      turmaColWidth: 150 * zoom,
      headerHeight: 44 * zoom,
      cellMinHeight: 60 * zoom,
      daySeparatorHeight: 8 * zoom,
      periodSeparatorHeight: 8 * zoom,
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
    if (!isNaN(newYear) && newYear > 2000 && newYear < 2100) {
      dataDispatch({ type: 'UPDATE_ANO', payload: newYear });
    } else {
      setYearInput(ano.toString());
      uiDispatch({ type: 'SHOW_TOAST', payload: 'Ano inválido.' });
    }
    setIsEditingYear(false);
  };

  const handleYearKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    } else if (e.key === 'Escape') {
      setYearInput(ano.toString());
      setIsEditingYear(false);
    }
  };

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

  const handleVisibilityChange = (newVisibility: VisibilityState) => {
      setVisibility(newVisibility);
      const toSave = { periods: newVisibility.periods };
      localStorage.setItem('grid_visibility', JSON.stringify(toSave));
  };

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Allow shortcuts if the focus is NOT on a form input
    const target = e.target as HTMLElement;
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable) {
        return;
    }
    
    if (selectedSlotId) {
      if (e.ctrlKey) {
          if (e.key === 'c') {
              e.preventDefault();
              const slot = grade.find(s => s.id === selectedSlotId);
              if (slot) gridDispatch({ type: 'COPY_SLOT', payload: { sourceSlot: slot } });
          } else if (e.key === 'x') {
              e.preventDefault();
              const slot = grade.find(s => s.id === selectedSlotId);
              if (slot) gridDispatch({ type: 'CUT_SLOT', payload: { sourceSlot: slot } });
          } else if (e.key === 'v') {
              e.preventDefault();
              if (clipboard) {
                  const sourceTurma = allTurmas.find(t => t.id === clipboard.sourceSlot.turmaId);
                  const destTurmaId = selectedSlotId.split('_')[0];
                  const destTurma = allTurmas.find(t => t.id === destTurmaId);
                  
                  if (sourceTurma && destTurma && sourceTurma.isModular !== destTurma.isModular) {
                      uiDispatch({ type: 'SHOW_TOAST', payload: 'Não é permitido colar aulas entre a grade regular e a modular.' });
                      return;
                  }
                  dataDispatch({ type: 'PASTE_SLOT', payload: { destinationId: selectedSlotId, sourceSlot: clipboard.sourceSlot, isCut: clipboard.type === 'cut' } });
                  gridDispatch({ type: 'PASTE_SLOT', payload: { isCut: clipboard.type === 'cut' } });
              }
          }
      } else if (e.key === 'Delete') {
          e.preventDefault();
          dataDispatch({ type: 'DELETE_SLOT', payload: { slotId: selectedSlotId } });
      }
    }
  }, [selectedSlotId, dataDispatch, gridDispatch, clipboard, allTurmas, grade, uiDispatch]);

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
    const scrollThreshold = 60;
    const scrollSpeed = 10;

    if (y < scrollThreshold) {
      container.scrollTop -= scrollSpeed;
    } else if (y > rect.height - scrollThreshold) {
      container.scrollTop += scrollSpeed;
    }
  };

  const handleCloseContextMenu = () => {
    setContextMenu({ ...contextMenu, isOpen: false });
  };

  const handleOpenContextMenu = useCallback((e: React.MouseEvent, slotId: string) => {
    e.preventDefault();
    e.stopPropagation();
    gridDispatch({ type: 'SELECT_SLOT', payload: { slotId } });
    setContextMenu({ isOpen: true, x: e.pageX, y: e.pageY, slotId });
  }, [gridDispatch]);
  
  const getContextMenuItems = (): ContextMenuItem[] => {
    const { slotId } = contextMenu;
    if (!slotId) return [];

    const slot = grade.find(s => s.id === slotId);
    const isOccupied = !!slot;
    const canPaste = !!clipboard;

    const copyItem: ContextMenuItem = {
        label: 'Copiar',
        onClick: () => slot && gridDispatch({ type: 'COPY_SLOT', payload: { sourceSlot: slot } }),
        disabled: !isOccupied
    };
    const cutItem: ContextMenuItem = {
        label: 'Recortar',
        onClick: () => slot && gridDispatch({ type: 'CUT_SLOT', payload: { sourceSlot: slot } }),
        disabled: !isOccupied
    };
    const pasteItem: ContextMenuItem = {
        label: 'Colar',
        onClick: () => {
           if (clipboard) {
               dataDispatch({ type: 'PASTE_SLOT', payload: { destinationId: slotId, sourceSlot: clipboard.sourceSlot, isCut: clipboard.type === 'cut' } });
               gridDispatch({ type: 'PASTE_SLOT', payload: { isCut: clipboard.type === 'cut' } });
           }
        },
        disabled: !canPaste
    };

    return [copyItem, cutItem, pasteItem];
  };

  const handleSelectSlot = useCallback((slotId: string | null) => {
      gridDispatch({ type: 'SELECT_SLOT', payload: { slotId } });
  }, [gridDispatch]);

  const handleProfessorHover = useCallback((professorId: string | null) => {
      if(isFocusModeEnabled) setHoveredProfessorId(professorId);
  }, [isFocusModeEnabled]);

  const noOp = useCallback(() => {}, []);

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
      turmas: turmas.filter(t => t.cursoId === curso.id)
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

                    // Check period mismatch
                    let currentSlotPeriod: 'manha' | 'tarde' | 'noite' = 'noite';
                    if (HORARIOS_MANHA.includes(horario)) currentSlotPeriod = 'manha';
                    else if (HORARIOS_TARDE.includes(horario)) currentSlotPeriod = 'tarde';

                    if (turma.periodo !== currentSlotPeriod) {
                        isHardFail = true;
                    }

                    if (!isHardFail && !sourceProfessor.disponibilidade[dia]?.includes(horario)) {
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
        onVisibilityChange={handleVisibilityChange}
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
                    <div key={`${dia}_${horario}_time`} className={timeHeaderClasses} style={{ left: `${scaledDimensions.dayColWidth}px`, fontSize: `${scaledDimensions.fontSizeTime}px` }}>
                        {horario}
                    </div>,
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
                                onProfessorHover={isFocusModeEnabled ? handleProfessorHover : noOp}
                                highlightStatus={validMoveHighlights[id] || null}
                                cellAlerts={cellAlertsMap.get(id) || EMPTY_ALERTS}
                                subCellAlerts0={cellAlertsMap.get(`${id}-0`) || EMPTY_ALERTS}
                                subCellAlerts1={cellAlertsMap.get(`${id}-1`) || EMPTY_ALERTS}
                                highlightStatus0={validMoveHighlights[`${id}-0`] || null}
                                highlightStatus1={validMoveHighlights[`${id}-1`] || null}
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
                  <div
                      className={`sticky left-0 z-30 bg-slate-200 py-2 text-center font-semibold border-r-2 border-slate-300 flex items-center justify-center capitalize [writing-mode:vertical-rl] rotate-180`}
                      style={{ gridRow: `span ${dayContentRows}`, fontSize: `${scaledDimensions.fontSizeHeader}px` }}
                  >
                      {dia}
                  </div>
                  
                  <div style={{ display: 'contents' }}>
                    {dayTimeSlotsAndSeparators}
                  </div>
                  
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
