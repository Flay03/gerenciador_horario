import React, { useState, useEffect, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { Disciplina } from '../../types';
import Modal from '../Modal';
import ConfirmationModal from '../ConfirmationModal';
import BnccManagerModal from './BnccManagerModal';

const DisciplinasManager: React.FC = () => {
  const { state, dispatch } = useData();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBnccModalOpen, setIsBnccModalOpen] = useState(false);
  const [currentDisciplina, setCurrentDisciplina] = useState<Disciplina | null>(null);
  const [formData, setFormData] = useState({ nome: '', turmaId: '', divisao: false, numProfessores: 1, aulasSemanais: 1 });
  const [selectedCurso, setSelectedCurso] = useState<string>('all');
  const [confirmModal, setConfirmModal] = useState<{isOpen: boolean, id: string | null}>({isOpen: false, id: null});

  useEffect(() => {
    if (!formData.turmaId && state.turmas.length > 0) {
      setFormData(prev => ({ ...prev, turmaId: state.turmas[0].id }));
    }
  }, [state.turmas, formData.turmaId]);

  const selectedTurmaIsModular = useMemo(() => {
    return state.turmas.find(t => t.id === formData.turmaId)?.isModular ?? false;
  }, [formData.turmaId, state.turmas]);

  const handleOpenModal = (disciplina: Disciplina | null) => {
    setCurrentDisciplina(disciplina);
    if (disciplina) {
        setFormData({ ...disciplina });
    } else {
        const defaultTurmaId = state.turmas.length > 0 ? state.turmas[0].id : '';
        const defaultTurma = state.turmas.find(t => t.id === defaultTurmaId);
        const defaultAulas = defaultTurma?.isModular ? 1.25 : 1;
        setFormData({
            nome: '',
            turmaId: defaultTurmaId,
            divisao: false,
            numProfessores: 1,
            aulasSemanais: defaultAulas,
        });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setCurrentDisciplina(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nome.trim() || !formData.turmaId) return;
    
    const finalData = { ...formData, numProfessores: formData.divisao ? formData.numProfessores : 1 };

    if (currentDisciplina) {
      dispatch({ type: 'UPDATE_DISCIPLINA', payload: { ...currentDisciplina, ...finalData } });
    } else {
      dispatch({ type: 'ADD_DISCIPLINA', payload: { id: `d${Date.now()}`, ...finalData } });
    }
    handleCloseModal();
  };
  
  const handleDeleteClick = (id: string) => {
    setConfirmModal({ isOpen: true, id: id });
  };

  const handleConfirmDelete = () => {
    if (confirmModal.id) {
        dispatch({ type: 'DELETE_DISCIPLINA', payload: { id: confirmModal.id } });
    }
    setConfirmModal({ isOpen: false, id: null });
  };

  const handleTurmaChange = (newTurmaId: string) => {
    setFormData(prev => {
        // Only change aulasSemanais if we are creating a new discipline.
        // If editing, we just want to change the turmaId, not reset the class count.
        if (currentDisciplina) {
            return { ...prev, turmaId: newTurmaId };
        }

        const selectedTurma = state.turmas.find(t => t.id === newTurmaId);
        const newDefaultAulas = selectedTurma?.isModular ? 1.25 : 1;

        return {
            ...prev,
            turmaId: newTurmaId,
            aulasSemanais: newDefaultAulas,
        };
    });
  };

  const getTurmaName = (turmaId: string) => state.turmas.find(t => t.id === turmaId)?.nome || 'N/A';
  
  const filteredDisciplinas = useMemo(() => {
    if (selectedCurso === 'all') {
      return state.disciplinas;
    }
    const turmasDoCursoIds = state.turmas.filter(t => t.cursoId === selectedCurso).map(t => t.id);
    return state.disciplinas.filter(d => turmasDoCursoIds.includes(d.turmaId));
  }, [state.disciplinas, state.turmas, selectedCurso]);

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Gerenciar Disciplinas</h2>
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
          <button onClick={() => setIsBnccModalOpen(true)} className="self-end px-4 py-2 bg-cyan-600 text-white rounded-md hover:bg-cyan-700">
            Gerenciar Grupos BNCC
          </button>
          <button onClick={() => handleOpenModal(null)} className="self-end px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-gray-400" disabled={state.turmas.length === 0}>
            Adicionar Disciplina
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredDisciplinas.length > 0 ? (
          filteredDisciplinas.map((d) => (
            <div key={d.id} className="bg-white border border-gray-200 rounded-lg shadow-sm p-4 flex flex-col justify-between hover:shadow-md transition-shadow">
                <div>
                    <h4 className="font-bold text-gray-800">{d.nome}</h4>
                    <p className="text-sm text-gray-500">{getTurmaName(d.turmaId)}</p>
                    <p className="text-sm text-gray-500">{d.aulasSemanais} aulas/semana</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                        {d.bnccId && <span className="text-xs bg-pink-100 text-pink-800 font-semibold px-2 py-0.5 rounded-full">BNCC</span>}
                        {d.divisao && <span className="text-xs bg-blue-100 text-blue-800 font-semibold px-2 py-0.5 rounded-full">Divisão ({d.numProfessores})</span>}
                    </div>
                </div>
                <div className="flex justify-end space-x-2 mt-4">
                    <button onClick={() => handleOpenModal(d)} className="p-2 text-gray-500 hover:text-indigo-600 rounded-full hover:bg-gray-100 transition-colors" title="Editar">
                       <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L14.732 3.732z" /></svg>
                    </button>
                    <button onClick={() => handleDeleteClick(d.id)} className="p-2 text-gray-500 hover:text-red-600 rounded-full hover:bg-gray-100 transition-colors" title="Excluir">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                </div>
            </div>
          ))
        ) : (
          <div className="col-span-full bg-white border border-gray-200 rounded-lg shadow-sm p-6 text-center text-gray-500">
            {state.disciplinas.length === 0 ? 'Nenhuma disciplina cadastrada.' : 'Nenhuma disciplina encontrada para o filtro selecionado.'}
          </div>
        )}
      </div>
      
      <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={currentDisciplina ? 'Editar Disciplina' : 'Adicionar Disciplina'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium">Nome da Disciplina</label>
            <input type="text" value={formData.nome} onChange={e => setFormData({...formData, nome: e.target.value})} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" required />
          </div>
          <div>
            <label className="block text-sm font-medium">Aulas por Semana</label>
            <input 
              type="number" 
              min={selectedTurmaIsModular ? "1.25" : "1"} 
              step={selectedTurmaIsModular ? "1.25" : "1"}
              value={formData.aulasSemanais} 
              onChange={e => setFormData({...formData, aulasSemanais: parseFloat(e.target.value) || (selectedTurmaIsModular ? 1.25 : 1)})} 
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" />
          </div>
          <div>
            <label className="block text-sm font-medium">Turma</label>
            <select value={formData.turmaId} onChange={e => handleTurmaChange(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" required>
              {state.turmas.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
            </select>
          </div>
          <div className="flex items-start">
              <div className="flex items-center h-5">
                <input id="divisao" type="checkbox" checked={formData.divisao} onChange={e => setFormData({...formData, divisao: e.target.checked})} className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300 rounded" />
              </div>
              <div className="ml-3 text-sm">
                <label htmlFor="divisao" className="font-medium text-gray-700">Divisão de turma?</label>
              </div>
          </div>
          {formData.divisao && (
            <div>
              <label className="block text-sm font-medium">Número de Professores</label>
              <input type="number" min="2" value={formData.numProfessores} onChange={e => setFormData({...formData, numProfessores: parseInt(e.target.value) || 2})} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" />
            </div>
          )}
          <div className="mt-4 flex justify-end space-x-2">
             <button type="button" onClick={handleCloseModal} className="px-4 py-2 bg-gray-200 rounded-md">Cancelar</button>
             <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-md">Salvar</button>
          </div>
        </form>
      </Modal>

       <ConfirmationModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ isOpen: false, id: null })}
        onConfirm={handleConfirmDelete}
        title="Confirmar Exclusão de Disciplina"
        message="Tem certeza que deseja excluir esta disciplina? Todas as atribuições e aulas associadas também serão removidas permanentemente."
      />

      <BnccManagerModal 
        isOpen={isBnccModalOpen}
        onClose={() => setIsBnccModalOpen(false)}
      />

    </div>
  );
};

export default DisciplinasManager;