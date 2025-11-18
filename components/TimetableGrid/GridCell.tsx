import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { useGrid } from '../../context/GridContext';
import { useUI } from '../../context/UIContext';
import { ALERT_COLORS, HORARIOS_MANHA, HORARIOS_TARDE } from '../../constants';
import Tooltip from '../Tooltip';
import { GradeSlot, Periodo, Disciplina, GridType, Turma, Professor, Alerta } from '../../types';

type HighlightStatus = 'valid' | 'warning' | null;

const getPeriodoFromHorario = (horario: string): Periodo => {
    if (HORARIOS_MANHA.includes(horario)) return 'manha';
    if (HORARIOS_TARDE.includes(horario)) return 'tarde';
    return 'noite';
};

interface GridCellProps {
  id: string; // base id: `${turmaId}_${dia}_${horario}`
  gridType: GridType;
  turma: Turma;
  fullSlot: GradeSlot | undefined;
  slot0: GradeSlot | undefined;
  slot1: GradeSlot | undefined;
  isLastInCourse: boolean;
  cellAlerts: Alerta[];
  subCellAlerts0: Alerta[];
  subCellAlerts1: Alerta[];
  onOpenContextMenu: (e: React.MouseEvent, slotId: string) => void;
  onSelectSlot: (slotId: string | null) => void;
  selectedSlotId: string | null;
  hoveredProfessorId: string | null;
  onProfessorHover: (professorId: string | null) => void;
  highlightStatus: HighlightStatus;
  subSlotHighlightStatus: {
      '0': HighlightStatus;
      '1': HighlightStatus;
  };
  scaledCellMinHeight: number;
  scaledCellFontSize: number;
}

// --- SUB-CELL COMPONENT ---
interface SubCellProps {
  baseId: string;
  subSlotIndex: 0 | 1;
  slot: GradeSlot | undefined;
  isOutOfPeriod: boolean;
  alerts: Alerta[];
  onOpenContextMenu: (e: React.MouseEvent, slotId: string) => void;
  onSelectSlot: (slotId: string | null) => void;
  isSelected: boolean;
  hoveredProfessorId: string | null;
  onProfessorHover: (professorId: string | null) => void;
  highlightStatus: HighlightStatus;
  onDragStart: (e: React.DragEvent<HTMLDivElement>, slotId: string) => void;
  onDragEnd: (e: React.DragEvent<HTMLDivElement>) => void;
  disciplina: Disciplina | null | undefined;
  professor: Professor | null | undefined;
  scaledCellFontSize: number;
}

const SubCell: React.FC<SubCellProps> = React.memo(({ 
  baseId, subSlotIndex, slot, isOutOfPeriod, alerts, onOpenContextMenu, onSelectSlot, isSelected, 
  hoveredProfessorId, onProfessorHover, highlightStatus, onDragStart, onDragEnd, disciplina, professor, scaledCellFontSize 
}) => {
  const [isTooltipVisible, setIsTooltipVisible] = useState(false);
  const subCellId = `${baseId}-${subSlotIndex}`;

  const handleClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      onSelectSlot(subCellId);
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.stopPropagation();
    onOpenContextMenu(e, subCellId);
  };
  
  const mainAlert = alerts.find(a => a.gradeSlotIds.includes(subCellId)) ?? (alerts.length > 0 && slot ? alerts[0] : null);
  
  const getHighlightBgClass = (status: HighlightStatus) => {
    if (status === 'valid') return 'bg-green-200';
    if (status === 'warning') return 'bg-yellow-200';
    return '';
  }

  let bgColor = isOutOfPeriod ? 'bg-slate-200' : 'bg-white';
  if (highlightStatus && !slot) bgColor = getHighlightBgClass(highlightStatus);
  if (isSelected) bgColor = 'bg-indigo-50';
  if (mainAlert) bgColor = ALERT_COLORS[mainAlert.tipo].bg;
  
  const selectionClass = isSelected ? 'ring ring-indigo-500 z-10' : '';
  
  const isHighlighted = hoveredProfessorId && slot && slot.professorId === hoveredProfessorId && !isSelected;
  const isDimmed = hoveredProfessorId && slot && slot.professorId !== hoveredProfessorId;

  const cellContent = slot && disciplina && professor ? (
    <div className="p-1 text-left w-full h-full overflow-hidden" style={{ fontSize: `${scaledCellFontSize}px` }}>
      <p className="font-bold truncate">{disciplina.nome}</p>
      <p className="text-gray-600 truncate">{professor.nome}</p>
    </div>
  ) : <div className="w-full h-full"></div>;

  const tooltipContent = alerts.length > 0 ? (
    <div>
      <h4 className="font-bold mb-1">Alertas:</h4>
      <ul className="list-disc list-inside text-xs">
        {alerts.map(a => <li key={a.id}>{a.detalhes}</li>)}
      </ul>
    </div>
  ) : null;

  return (
      <div
        title={slot && disciplina && professor ? `Disciplina: ${disciplina.nome}\nProfessor: ${professor.nome}` : undefined}
        draggable={!!slot}
        onDragStart={(e) => slot && onDragStart(e, slot.id)}
        onDragEnd={onDragEnd}
        onClick={handleClick}
        onContextMenu={handleContextMenu}
        onMouseEnter={() => { if (slot) onProfessorHover(slot.professorId); }}
        className={`relative h-1/2 transition-all duration-150 ${bgColor} ${selectionClass} ${slot ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'} ${isHighlighted ? 'ring-2 ring-slate-700 z-20' : ''} ${isDimmed ? 'opacity-40' : ''}`}
      >
        <Tooltip
          content={tooltipContent}
          isVisible={isTooltipVisible}
          onVisibilityChange={setIsTooltipVisible}
        >
          {cellContent}
        </Tooltip>
      </div>
  )
});

// --- MAIN GRID-CELL COMPONENT ---
const GridCell: React.FC<GridCellProps> = ({ 
  id, gridType, turma, fullSlot, slot0, slot1, isLastInCourse, cellAlerts, subCellAlerts0, subCellAlerts1,
  onOpenContextMenu, onSelectSlot, selectedSlotId, hoveredProfessorId, onProfessorHover, 
  highlightStatus, subSlotHighlightStatus, scaledCellMinHeight, scaledCellFontSize 
}) => {
  const { state, dispatch: dataDispatch } = useData();
  const { state: gridState, dispatch: gridDispatch } = useGrid();
  const { dispatch: uiDispatch } = useUI();
  const { disciplinas, turmas, grade } = state;
  const { draggedItem, clipboard } = gridState;

  const [isDragOver, setIsDragOver] = useState(false);
  const [isTooltipVisible, setIsTooltipVisible] = useState(false);
  
  const horario = id.split('_').slice(2).join('_');
  const cellPeriodo = getPeriodoFromHorario(horario);
  const isOutOfPeriod = turma && turma.periodo !== cellPeriodo;
  
  const borderClasses = 'border-b border-gray-300';
  const finalBorderClass = isLastInCourse ? 'border-r-2 border-r-slate-400' : 'border-r border-gray-300';
  const isDisabled = gridType === 'modular' && horario === '18:10-19:00';

  if (isDisabled) {
    return (
      <div
        className={`relative ${finalBorderClass} ${borderClasses} bg-gray-200`}
        style={{
          minHeight: `${scaledCellMinHeight}px`,
          backgroundImage: 'repeating-linear-gradient(45deg, #d1d5db, #d1d5db 10px, #e5e7eb 10px, #e5e7eb 20px)',
        }}
        title="Horário não disponível para aulas modulares"
      />
    );
  }

  const getDraggedDisciplina = (): Disciplina | null => {
      if (!draggedItem) return null;
      const draggedDisciplinaId = draggedItem.type === 'SIDEBAR_ITEM'
          ? draggedItem.disciplinaId
          : grade.find(s => s.id === draggedItem.sourceSlotId)?.disciplinaId;
      return disciplinas.find(d => d.id === draggedDisciplinaId) || null;
  };
  
  const onDragStart = (e: React.DragEvent<HTMLDivElement>, slotId: string) => {
    e.stopPropagation();
    setIsTooltipVisible(false);
    const dragData = { type: 'GRID_ITEM' as const, sourceSlotId: slotId };
    e.dataTransfer.setData('application/json', JSON.stringify(dragData));
    e.dataTransfer.effectAllowed = 'move';
    gridDispatch({ type: 'DRAG_START', payload: dragData });
  };

  const onDragEnd = () => {
    gridDispatch({ type: 'DRAG_END' });
  };

  const onDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!draggedItem) {
      e.dataTransfer.dropEffect = 'none';
      return;
    }

    const draggedDisciplina = getDraggedDisciplina();
    if (!draggedDisciplina) {
      e.dataTransfer.dropEffect = 'none';
      setIsDragOver(false);
      return;
    }

    let canDrop = false;
    if (draggedDisciplina.divisao) {
      const isTargetingSubSlot = slot0 || slot1;
      if (draggedItem.type === 'GRID_ITEM' && isTargetingSubSlot) {
        canDrop = true;
      } else if (!slot0 || !slot1) {
        canDrop = true;
      }
    } else {
      if (!fullSlot && !slot0 && !slot1) {
        canDrop = true;
      } else if (draggedItem.type === 'GRID_ITEM' && fullSlot) {
        canDrop = true;
      }
    }
    
    if (canDrop) {
      setIsDragOver(true);
      e.dataTransfer.dropEffect = 'move';
    } else {
      setIsDragOver(false);
      e.dataTransfer.dropEffect = 'none';
    }
  };
  
  const onDragLeave = () => {
    setIsDragOver(false);
  };
  
  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (!draggedItem) return;

    try {
        const draggedDisciplina = getDraggedDisciplina();
        if (!draggedDisciplina) return;

        const sourceTurma = turmas.find(t => t.id === draggedDisciplina.turmaId);
        const destinationTurma = turma;
        if (sourceTurma && destinationTurma && sourceTurma.isModular !== destinationTurma.isModular) {
            uiDispatch({ type: 'SHOW_TOAST', payload: 'Não é permitido mover aulas entre a grade regular e a modular.' });
            return;
        }

        let destinationId: string;

        if (draggedDisciplina.divisao) {
            const rect = e.currentTarget.getBoundingClientRect();
            const isTopHalf = e.clientY < rect.top + rect.height / 2;
            const targetSubSlotId = `${id}-${isTopHalf ? 0 : 1}`;
            const otherSubSlotId = `${id}-${isTopHalf ? 1 : 0}`;
            
            const targetSlot = grade.find(s => s.id === targetSubSlotId);
            if (targetSlot && draggedItem.sourceSlotId !== targetSubSlotId) {
                const otherSlot = grade.find(s => s.id === otherSubSlotId);
                destinationId = !otherSlot ? otherSubSlotId : targetSubSlotId;
            } else {
                destinationId = targetSubSlotId;
            }
        } else {
            if (fullSlot || slot0 || slot1) {
                 if(fullSlot && draggedItem.type === 'GRID_ITEM') {
                    destinationId = id;
                 } else {
                    return;
                 }
            } else {
                 destinationId = id;
            }
        }

        if (draggedItem.type === 'GRID_ITEM' && draggedItem.sourceSlotId === destinationId) return;
        
        if (draggedItem.type === 'SIDEBAR_ITEM') {
            const { disciplinaId, professorId } = draggedItem;
            if (disciplinaId && professorId) {
                if (!destinationId) return;
                const parts = destinationId.split('_');
                const dia = parts[1];
                let horario = parts.slice(2).join('_');
                const subSlotMatch = horario.match(/(.*)-([01])$/);
                if (subSlotMatch) horario = subSlotMatch[1];

                dataDispatch({
                    type: 'UPDATE_GRADE',
                    payload: { id: destinationId, slot: { id: destinationId, turmaId: turma.id, dia, horario, disciplinaId, professorId } }
                });
            }
        } else if (draggedItem.type === 'GRID_ITEM' && draggedItem.sourceSlotId) {
            if (!destinationId) return;
            dataDispatch({ type: 'SWAP_GRADE_SLOTS', payload: { sourceId: draggedItem.sourceSlotId, destinationId: destinationId } });
        }
    } catch (error) {
        console.error("Error handling drop in GridCell:", error);
    } finally {
        gridDispatch({ type: 'DRAG_END' });
    }
  };

  const handleContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const disciplinaInClipboard = disciplinas.find(d => d.id === clipboard?.sourceSlot.disciplinaId);
    const isPastingDivided = !!disciplinaInClipboard?.divisao;

    let targetId = id;
    if (!fullSlot && !slot0 && !slot1 && isPastingDivided) {
        const rect = e.currentTarget.getBoundingClientRect();
        const isTopHalf = e.clientY < rect.top + rect.height / 2;
        targetId = `${id}-${isTopHalf ? 0 : 1}`;
    }
    onSelectSlot(targetId);
  }
  
  const handleContainerContextMenu = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();

    const disciplinaInClipboard = disciplinas.find(d => d.id === clipboard?.sourceSlot.disciplinaId);
    const isPastingDivided = !!disciplinaInClipboard?.divisao;

    let targetId = id;
    if (!fullSlot && !slot0 && !slot1 && isPastingDivided) {
        const rect = e.currentTarget.getBoundingClientRect();
        const isTopHalf = e.clientY < rect.top + rect.height / 2;
        targetId = `${id}-${isTopHalf ? 0 : 1}`;
    }
    
    onOpenContextMenu(e, targetId);
  };

  const isSelected = selectedSlotId === id;
  
  const getHighlightBgClass = (status: HighlightStatus) => {
    if (status === 'valid') return 'bg-green-200';
    if (status === 'warning') return 'bg-yellow-200';
    return '';
  }

  if (fullSlot) {
     const disciplina = state.disciplinas.find(d => d.id === fullSlot.disciplinaId);
     const professor = state.professores.find(p => p.id === fullSlot.professorId);
     const mainAlert = cellAlerts[0];
     
     const cellContent = disciplina && professor ? (
        <div className="p-1 text-left w-full h-full" style={{ fontSize: `${scaledCellFontSize}px` }}>
          <p className="font-bold truncate">{disciplina.nome}</p>
          <p className="text-gray-600 truncate">{professor.nome}</p>
        </div>
    ) : <div className="w-full h-full"></div>;

    const tooltipContent = cellAlerts.length > 0 ? (
        <div>
          <h4 className="font-bold mb-1">Alertas:</h4>
          <ul className="list-disc list-inside text-xs">{cellAlerts.map(a => <li key={a.id}>{a.detalhes}</li>)}</ul>
        </div>
    ) : null;
    
    let bgColor = isOutOfPeriod ? 'bg-slate-200' : 'bg-white';
    if (isSelected) bgColor = 'bg-indigo-50';
    if (mainAlert) bgColor = ALERT_COLORS[mainAlert.tipo].bg;
    if (isDragOver) bgColor = 'bg-blue-300';
    
    const handleClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        onSelectSlot(id);
    };
    
    const selectionClass = isSelected ? 'ring-2 ring-indigo-500 z-10' : '';
    const isHighlighted = hoveredProfessorId && fullSlot.professorId === hoveredProfessorId && !isSelected;
    const isDimmed = hoveredProfessorId && fullSlot.professorId !== hoveredProfessorId;

    return (
      <div
        title={disciplina && professor ? `Disciplina: ${disciplina.nome}\nProfessor: ${professor.nome}` : undefined}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={handleClick}
        draggable={!!fullSlot}
        onDragStart={(e) => onDragStart(e, fullSlot.id)}
        onDragEnd={onDragEnd}
        onContextMenu={(e) => { e.stopPropagation(); onOpenContextMenu(e, id); }}
        onMouseEnter={() => onProfessorHover(fullSlot.professorId)}
        className={`relative transition-all duration-150 ${bgColor} ${selectionClass} ${fullSlot ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'} ${borderClasses} ${isHighlighted ? 'ring-2 ring-slate-700 z-20' : ''} ${isDimmed ? 'opacity-40' : ''} ${finalBorderClass}`}
        style={{ minHeight: `${scaledCellMinHeight}px` }}
      >
        <Tooltip
          content={tooltipContent}
          isVisible={isTooltipVisible}
          onVisibilityChange={setIsTooltipVisible}
        >
          {cellContent}
        </Tooltip>
      </div>
    );
  }
  
  const isContainerSelected = isSelected && !selectedSlotId?.endsWith('-0') && !selectedSlotId?.endsWith('-1');
  
  let containerBg = isDragOver ? 'bg-blue-300' : (isOutOfPeriod ? 'bg-slate-200' : 'bg-white');
  if (highlightStatus) containerBg = getHighlightBgClass(highlightStatus);
  if (isContainerSelected) containerBg = 'bg-indigo-50';

  const selectionClass = isContainerSelected ? 'ring-2 ring-indigo-500 z-10' : '';

  const getSubCellData = (slot: GradeSlot | undefined) => {
    if (!slot) return { disciplina: null, professor: null };
    return {
      disciplina: state.disciplinas.find(d => d.id === slot.disciplinaId),
      professor: state.professores.find(p => p.id === slot.professorId),
    };
  };
  
  const dataSlot0 = getSubCellData(slot0);
  const dataSlot1 = getSubCellData(slot1);

  return (
    <div
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onClick={handleContainerClick}
      onContextMenu={handleContainerContextMenu}
      className={`relative flex flex-col ${containerBg} ${selectionClass} ${borderClasses} cursor-pointer ${finalBorderClass}`}
      style={{ minHeight: `${scaledCellMinHeight}px` }}
    >
      <SubCell 
          baseId={id} 
          subSlotIndex={0} 
          slot={slot0} 
          isOutOfPeriod={isOutOfPeriod} 
          alerts={[...cellAlerts, ...subCellAlerts0]}
          onOpenContextMenu={onOpenContextMenu} 
          onSelectSlot={onSelectSlot} 
          isSelected={selectedSlotId === `${id}-0`} 
          hoveredProfessorId={hoveredProfessorId} 
          onProfessorHover={onProfessorHover} 
          highlightStatus={subSlotHighlightStatus['0'] || highlightStatus} 
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
          disciplina={dataSlot0.disciplina}
          professor={dataSlot0.professor}
          scaledCellFontSize={scaledCellFontSize}
      />
      <div className="border-b border-dashed border-gray-300"></div>
      <SubCell 
          baseId={id} 
          subSlotIndex={1} 
          slot={slot1} 
          isOutOfPeriod={isOutOfPeriod} 
          alerts={[...cellAlerts, ...subCellAlerts1]}
          onOpenContextMenu={onOpenContextMenu} 
          onSelectSlot={onSelectSlot} 
          isSelected={selectedSlotId === `${id}-1`} 
          hoveredProfessorId={hoveredProfessorId} 
          onProfessorHover={onProfessorHover} 
          highlightStatus={subSlotHighlightStatus['1'] || highlightStatus}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
          disciplina={dataSlot1.disciplina}
          professor={dataSlot1.professor}
          scaledCellFontSize={scaledCellFontSize}
      />
    </div>
  );
};

export default React.memo(GridCell);