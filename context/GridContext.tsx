import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { GridState, GridAction } from '../types';

const initialState: GridState = {
  draggedItem: null,
  clipboard: null,
  selectedSlotId: null,
};

const gridReducer = (state: GridState, action: GridAction): GridState => {
  switch (action.type) {
    case 'DRAG_START':
      return { ...state, draggedItem: action.payload, clipboard: null, selectedSlotId: null };
    case 'DRAG_END':
      return { ...state, draggedItem: null };
    case 'SELECT_SLOT':
      return { ...state, selectedSlotId: action.payload.slotId };
    case 'COPY_SLOT':
      return { ...state, clipboard: { sourceSlot: action.payload.sourceSlot, type: 'copy' }, draggedItem: null };
    case 'CUT_SLOT':
      return { ...state, clipboard: { sourceSlot: action.payload.sourceSlot, type: 'cut' }, draggedItem: null, selectedSlotId: null };
    case 'CLEAR_CLIPBOARD':
        return { ...state, clipboard: null };
    case 'PASTE_SLOT':
      return { ...state, clipboard: action.payload.isCut ? null : state.clipboard };
    default:
      return state;
  }
};

const GridContext = createContext<{ state: GridState; dispatch: React.Dispatch<GridAction> } | undefined>(undefined);

export const GridProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(gridReducer, initialState);

  return (
    <GridContext.Provider value={{ state, dispatch }}>
      {children}
    </GridContext.Provider>
  );
};

export const useGrid = () => {
  const context = useContext(GridContext);
  if (!context) {
    throw new Error('useGrid must be used within a GridProvider');
  }
  return context;
};