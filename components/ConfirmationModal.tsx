
import React, { useRef, useEffect } from 'react';
import Modal from './Modal';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: React.ReactNode;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ isOpen, onClose, onConfirm, title, message }) => {
  const cancelButtonRef = useRef<HTMLButtonElement>(null);

  // Automatically focus the cancel button when the modal opens for safety (Safe Default)
  useEffect(() => {
    if (isOpen) {
      // Small timeout to ensure element is rendered in DOM
      setTimeout(() => {
        cancelButtonRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };
  
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div className="space-y-4">
        <p className="text-sm text-gray-700">{message}</p>
        <div className="mt-6 flex justify-end space-x-2">
          <button 
            ref={cancelButtonRef}
            type="button" 
            onClick={onClose} 
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
          >
            Cancelar
          </button>
          <button 
            type="button" 
            onClick={handleConfirm}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
            Confirmar Exclusão
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default ConfirmationModal;
