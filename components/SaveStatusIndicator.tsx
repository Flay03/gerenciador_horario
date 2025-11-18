import React from 'react';
import { SaveStatus } from '../types';

interface SaveStatusIndicatorProps {
  status: SaveStatus;
  lastModifiedBy: string | null;
  lastModifiedAt: string | null;
}

const SaveStatusIndicator: React.FC<SaveStatusIndicatorProps> = ({ status, lastModifiedBy, lastModifiedAt }) => {
  const getStatusContent = () => {
    switch (status) {
      case 'saving':
        return {
          icon: (
            <svg className="animate-spin h-5 w-5 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ),
          text: 'Salvando...',
          textColor: 'text-gray-500',
        };
      case 'saved':
        return {
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4" />
            </svg>
          ),
          text: 'Salvo',
          textColor: 'text-green-600',
        };
      case 'error':
        return {
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 13V9.5m0 6.5v.01" />
            </svg>
          ),
          text: 'Erro ao salvar',
          textColor: 'text-red-600',
        };
      default:
        return null;
    }
  };

  const content = getStatusContent();
  if (!content) return null;

  const modificationText = status === 'saved' && lastModifiedBy && lastModifiedAt
    ? `(por ${lastModifiedBy} às ${new Date(lastModifiedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })})`
    : null;

  return (
    <div className="flex items-center space-x-2">
      {content.icon}
      <span className={`text-sm font-medium ${content.textColor}`}>{content.text}</span>
      {modificationText && <span className="text-xs text-gray-500 whitespace-nowrap">{modificationText}</span>}
    </div>
  );
};

export default SaveStatusIndicator;