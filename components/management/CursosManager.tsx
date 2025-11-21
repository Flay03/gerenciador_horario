import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { Curso } from '../../types';
import Modal from '../Modal';
import ConfirmationModal from '../ConfirmationModal';
import { sanitizeString } from '../../hooks/useSanitizedInput';

const CursosManager: React.FC = () => {
  const { state, dispatch } = useData();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentCurso, setCurrentCurso] = useState<Curso | null>(null);
  const [cursoName, setCursoName] = useState('');
  const [confirmModal, setConfirmModal] = useState<{isOpen: boolean, id: string | null}>({isOpen: false, id: null});

  const handleOpenModal = (curso: Curso | null) => {
    setCurrentCurso(curso);
    setCursoName(curso ? curso.nome : '');
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setCurrentCurso(null);
    setCursoName('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cursoName.trim()) return;

    const cleanName = sanitizeString(cursoName);

    if (currentCurso) {
      dispatch({ type: 'UPDATE_CURSO', payload: { ...currentCurso, nome: cleanName } });
    } else {
      dispatch({ type: 'ADD_CURSO', payload: { id: `c${Date.now()}`, nome: cleanName } });
    }
    handleCloseModal();
  };

  const handleDeleteClick = (id: string) => {
    setConfirmModal({ isOpen: true, id: id });
  };

  const handleConfirmDelete = () => {
    if (confirmModal.id) {
        dispatch({ type: 'DELETE_CURSO', payload: { id: confirmModal.id } });
    }
    setConfirmModal({ isOpen: false, id: null });
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Gerenciar Cursos</h2>
        <button onClick={() => handleOpenModal(null)} className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">
          Adicionar Curso
        </button>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {state.cursos.length > 0 ? (
          state.cursos.map((curso) => (
            <div key={curso.id} className="bg-white border border-gray-200 rounded-lg shadow-sm p-4 flex flex-col justify-between hover:shadow-md transition-shadow">
                <span className="font-medium text-gray-800 mb-4">{curso.nome}</span>
                <div className="flex justify-end space-x-2">
                    <button onClick={() => handleOpenModal(curso)} className="p-2 text-gray-500 hover:text-indigo-600 rounded-full hover:bg-gray-100 transition-colors" title="Editar">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L14.732 3.732z" />
                        </svg>
                    </button>
                    <button onClick={() => handleDeleteClick(curso.id)} className="p-2 text-gray-500 hover:text-red-600 rounded-full hover:bg-gray-100 transition-colors" title="Excluir">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                    </button>
                </div>
            </div>
          ))
        ) : (
          <div className="col-span-full bg-white border border-gray-200 rounded-lg shadow-sm p-6 text-center text-gray-500">
            Nenhum curso cadastrado.
          </div>
        )}
      </div>

      <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={currentCurso ? 'Editar Curso' : 'Adicionar Curso'}>
        <form onSubmit={handleSubmit}>
          <label htmlFor="cursoName" className="block text-sm font-medium text-gray-700">Nome do Curso</label>
          <input
            type="text"
            id="cursoName"
            value={cursoName}
            onChange={(e) => setCursoName(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            required
          />
          <div className="mt-4 flex justify-end space-x-2">
             <button type="button" onClick={handleCloseModal} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">Cancelar</button>
             <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">Salvar</button>
          </div>
        </form>
      </Modal>

      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ isOpen: false, id: null })}
        onConfirm={handleConfirmDelete}
        title="Confirmar Exclusão de Curso"
        message="Tem certeza que deseja excluir este curso? Todas as turmas, disciplinas e aulas associadas também serão removidas permanentemente."
      />
    </div>
  );
};

export default CursosManager;