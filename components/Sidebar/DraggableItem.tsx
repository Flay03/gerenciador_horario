import React from 'react';
import { useData } from '../../context/DataContext';

interface DraggableItemProps {
  id: string;
  label: React.ReactNode;
  subLabel: string;
  isLocked?: boolean;
  isBeingDragged?: boolean;
}

const DraggableItem: React.FC<DraggableItemProps> = ({ id, label, subLabel, isLocked = false, isBeingDragged = false }) => {
  const { dispatch } = useData();
  
  const onDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    if (isLocked) {
      e.preventDefault();
      return;
    }
    const [disciplinaId, professorId] = id.split('|');
    const dragData = {
        type: 'SIDEBAR_ITEM' as const,
        disciplinaId,
        professorId
    };
    // This is still needed for Firefox and some other browsers to initiate the drag.
    e.dataTransfer.setData('application/json', JSON.stringify(dragData));
    e.dataTransfer.effectAllowed = 'move';
    
    dispatch({ type: 'DRAG_START', payload: dragData });
  };
  
  const onDragEnd = () => {
    dispatch({ type: 'DRAG_END' });
  };

  const baseClasses = 'p-2 rounded-md shadow-sm transition-all duration-150';
  let stateClasses = '';

  if (isBeingDragged) {
    stateClasses = 'opacity-40 border-dashed border-indigo-400 bg-white';
  } else if (isLocked) {
    stateClasses = 'opacity-50 cursor-not-allowed bg-gray-100 border border-gray-200';
  } else {
    stateClasses = 'cursor-grab active:cursor-grabbing hover:bg-indigo-50 bg-white border border-gray-200';
  }

  return (
    <div
      draggable={!isLocked}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={`${baseClasses} ${stateClasses}`}
    >
      <div className="font-semibold text-sm text-gray-800">{label}</div>
      <p className="text-xs text-gray-500">{subLabel}</p>
    </div>
  );
};

export default DraggableItem;
