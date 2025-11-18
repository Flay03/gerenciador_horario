import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { UIState, UIAction } from '../types';

const initialState: UIState = {
  toastMessage: null,
  onlineUsers: [],
  saveStatus: 'idle',
  isSidebarCollapsed: false,
};

const uiReducer = (state: UIState, action: UIAction): UIState => {
  switch (action.type) {
    case 'SHOW_TOAST':
      return { ...state, toastMessage: action.payload };
    case 'SET_ONLINE_USERS':
      return { ...state, onlineUsers: action.payload };
    case 'SET_SAVE_STATUS':
      return { ...state, saveStatus: action.payload };
    case 'TOGGLE_SIDEBAR':
      return { ...state, isSidebarCollapsed: action.payload !== undefined ? action.payload : !state.isSidebarCollapsed };
    default:
      return state;
  }
};

const UIContext = createContext<{ state: UIState; dispatch: React.Dispatch<UIAction> } | undefined>(undefined);

export const UIProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(uiReducer, initialState);

  return (
    <UIContext.Provider value={{ state, dispatch }}>
      {children}
    </UIContext.Provider>
  );
};

export const useUI = () => {
  const context = useContext(UIContext);
  if (!context) {
    throw new Error('useUI must be used within a UIProvider');
  }
  return context;
};