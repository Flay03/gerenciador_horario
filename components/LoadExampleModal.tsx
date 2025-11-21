import React from 'react';
import { useData } from '../context/DataContext';
import { useUI } from '../context/UIContext';
import Modal from './Modal';

interface LoadExampleModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const LoadExampleModal: React.FC<LoadExampleModalProps> = ({ isOpen, onClose }) => {
  const { dispatch } = useData();
  const { dispatch: uiDispatch } = useUI();

  const handleLoadExample = async () => {
    try {
      const response = await fetch('/mock-data.json');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      
      if (data && data.version && Array.isArray(data.cursos)) {
        dispatch({ type: 'SET_STATE', payload: data });
        uiDispatch({ type: 'SHOW_TOAST', payload: 'Dados de exemplo carregados com sucesso!' });
      } else {
        throw new Error('Arquivo de exemplo inválido.');
      }
    } catch (error) {
      console.error("Erro ao carregar dados de exemplo:", error);
      uiDispatch({ type: 'SHOW_TOAST', payload: 'Falha ao carregar dados de exemplo.' });
    } finally {
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Carregar Dados de Exemplo">
      <div className="space-y-4">
        <p className="text-sm text-gray-700">
          <strong>Atenção:</strong> Esta ação irá substituir todos os dados atuais pelos dados de exemplo.
        </p>
        <p className="text-sm text-gray-700">
          Qualquer trabalho não salvo será perdido. Deseja continuar?
        </p>
        <div className="mt-4 flex justify-end space-x-2">
          <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">
            Cancelar
          </button>
          <button 
            type="button" 
            onClick={handleLoadExample}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
          >
            Carregar Exemplo
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default LoadExampleModal;