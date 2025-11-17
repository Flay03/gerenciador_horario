
import React, { useState, useEffect } from 'react';
import { useData } from '../context/DataContext';
import Modal from './Modal';

interface ClearDataModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ClearDataModal: React.FC<ClearDataModalProps> = ({ isOpen, onClose }) => {
  const { dispatch } = useData();
  const [confirmText, setConfirmText] = useState('');
  const canDelete = confirmText === 'DELETE';

  useEffect(() => {
    if (!isOpen) {
      setConfirmText('');
    }
  }, [isOpen]);

  const handleClearData = () => {
    if (canDelete) {
      try {
        dispatch({ type: 'CLEAR_DATA' });
      } finally {
        // This ensures the reload happens even if the dispatch has side effects
        // that might otherwise interfere with the reload.
        window.location.reload();
      }
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Apagar Todos os Dados">
      <div className="space-y-4">
        <p className="text-sm text-gray-700">
          <strong>Atenção:</strong> Esta ação é irreversível. Todos os cursos, turmas, disciplinas, professores, atribuições e a grade de horários serão permanentemente apagados.
        </p>
        <p className="text-sm text-gray-700">
          Para confirmar, por favor, digite <strong>DELETE</strong> no campo abaixo.
        </p>
        <div>
          <label htmlFor="confirm-delete" className="sr-only">Confirmar exclusão</label>
          <input
            type="text"
            id="confirm-delete"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="DELETE"
            autoComplete="off"
          />
        </div>
        <div className="mt-4 flex justify-end space-x-2">
          <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">
            Cancelar
          </button>
          <button 
            type="button" 
            onClick={handleClearData}
            disabled={!canDelete}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-red-300 disabled:cursor-not-allowed"
          >
            Apagar Tudo
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default ClearDataModal;
