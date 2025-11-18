import React, { useState, useEffect } from 'react';
import { useData } from '../../context/DataContext';
import { Turma, Periodo } from '../../types';
import Modal from '../Modal';
import ConfirmationModal from '../ConfirmationModal';

const TurmasManager: React.FC = () => {
  const { state, dispatch } = useData();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentTurma, setCurrentTurma] = useState<Turma | null>(null);
  const [formData, setFormData] = useState({ nome: '', cursoId: '', periodo: 'manha' as Periodo, isModular: false });
  const [selectedCurso, setSelectedCurso] = useState<string>('all');
  const [confirmModal, setConfirmModal] = useState<{isOpen: boolean, id: string | null}>({isOpen: false, id: null});

  useEffect(() => {
    // Set default cursoId if available
    if (!formData.cursoId && state.cursos.length > 0) {
      setFormData(prev => ({ ...prev, cursoId: state.cursos[0].id }));
    }
  }, [state.cursos, formData.cursoId]);

  const handleOpenModal = (turma: Turma | null) => {
    setCurrentTurma(turma);
    setFormData(turma ? { nome: turma.nome, cursoId: turma.cursoId, periodo: turma.periodo, isModular: !!turma.isModular } : { nome: '', cursoId: state.cursos[0]?.id || '', periodo: 'manha', isModular: false });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setCurrentTurma(null);
    setFormData({ nome: '', cursoId: '', periodo: 'manha', isModular: false });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nome.trim() || !formData.cursoId || !formData.periodo) return;

    if (currentTurma) {
      dispatch({ type: 'UPDATE_TURMA', payload: { ...currentTurma, ...formData } });
    } else {
      dispatch({ type: 'ADD_TURMA', payload: { id: `t${Date.now()}`, ...formData } });
    }
    handleCloseModal();
  };

  const handleDeleteClick = (id: string) => {
    setConfirmModal({ isOpen: true, id: id });
  };

  const handleConfirmDelete = () => {
    if (confirmModal.id) {
        dispatch({ type: 'DELETE_TURMA', payload: { id: confirmModal.id } });
    }
    setConfirmModal({ isOpen: false, id: null });
  };

  const getCursoName = (cursoId: string) => state.cursos.find(c => c.id === cursoId)?.nome || 'N/A';
  
  const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

  const filteredTurmas = state.turmas.filter(turma => {
    if (selectedCurso === 'all') {
      return true;
    }
    return turma.cursoId === selectedCurso;
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Gerenciar Turmas</h2>
        <div className="flex items-center space-x-4">
          <div className="w-64">
            <label htmlFor="curso-filter" className="block text-sm font-medium text-gray-700">Filtrar por Curso</label>
            <select
                id="curso-filter"
                value={selectedCurso}
                onChange={(e) => setSelectedCurso(e.target.value)}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
            >
                <option value="all">Todos os Cursos</option>
                {state.cursos.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>
          <button onClick={() => handleOpenModal(null)} className="self-end px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-gray-400" disabled={state.cursos.length === 0}>
            Adicionar Turma
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredTurmas.length > 0 ? (
          filteredTurmas.map((turma) => (
            <div key={turma.id} className="bg-white border border-gray-200 rounded-lg shadow-sm p-4 flex flex-col justify-between hover:shadow-md transition-shadow">
                <div>
                    <div className="flex justify-between items-start">
                        <h4 className="font-bold text-gray-800">{turma.nome}</h4>
                        {turma.isModular && <span className="flex-shrink-0 text-xs bg-purple-100 text-purple-800 font-semibold ml-2 px-2 py-0.5 rounded-full">Modular</span>}
                    </div>
                    <p className="text-sm text-gray-500">{getCursoName(turma.cursoId)}</p>
                    <p className="text-sm text-gray-500 capitalize">{turma.periodo}</p>
                </div>
                <div className="flex justify-end space-x-2 mt-4">
                    <button onClick={() => handleOpenModal(turma)} className="p-2 text-gray-500 hover:text-indigo-600 rounded-full hover:bg-gray-100 transition-colors" title="Editar">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L14.732 3.732z" /></svg>
                    </button>
                    <button onClick={() => handleDeleteClick(turma.id)} className="p-2 text-gray-500 hover:text-red-600 rounded-full hover:bg-gray-100 transition-colors" title="Excluir">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                </div>
            </div>
          ))
         ) : (
          <div className="col-span-full bg-white border border-gray-200 rounded-lg shadow-sm p-6 text-center text-gray-500">
            {state.turmas.length === 0 ? 'Nenhuma turma cadastrada.' : 'Nenhuma turma encontrada para o filtro selecionado.'}
          </div>
        )}
      </div>

      <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={currentTurma ? 'Editar Turma' : 'Adicionar Turma'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="turmaName" className="block text-sm font-medium text-gray-700">Nome da Turma</label>
            <input
              type="text"
              id="turmaName"
              value={formData.nome}
              onChange={(e) => setFormData({...formData, nome: e.target.value})}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              required
              maxLength={255}
            />
          </div>
          <div>
            <label htmlFor="cursoId" className="block text-sm font-medium text-gray-700">Curso</label>
            <select
              id="cursoId"
              value={formData.cursoId}
              onChange={(e) => setFormData({...formData, cursoId: e.target.value})}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
              required
            >
              <option value="" disabled>Selecione um curso</option>
              {state.cursos.map(curso => (
                <option key={curso.id} value={curso.id}>{curso.nome}</option>
              ))}
            </select>
          </div>
           <div>
            <label htmlFor="turmaPeriodo" className="block text-sm font-medium text-gray-700">Período</label>
            <select
              id="turmaPeriodo"
              value={formData.periodo}
              onChange={(e) => setFormData({...formData, periodo: e.target.value as Periodo})}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
              required
            >
              <option value="manha">Manhã</option>
              <option value="tarde">Tarde</option>
              <option value="noite">Noite</option>
            </select>
          </div>
          <div className="pt-2">
            <div className="flex items-start">
                <div className="flex items-center h-5">
                <input 
                    id="isModular" 
                    type="checkbox" 
                    checked={formData.isModular} 
                    onChange={e => setFormData({...formData, isModular: e.target.checked})} 
                    className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300 rounded" 
                />
                </div>
                <div className="ml-3 text-sm">
                <label htmlFor="isModular" className="font-medium text-gray-700">Turma Modular?</label>
                <p className="text-gray-500">Turmas modulares aparecerão em uma grade de horários separada.</p>
                </div>
            </div>
          </div>
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
        title="Confirmar Exclusão de Turma"
        message="Tem certeza que deseja excluir esta turma? Todas as disciplinas e aulas associadas também serão removidas permanentemente."
      />
    </div>
  );
};

export default TurmasManager;
