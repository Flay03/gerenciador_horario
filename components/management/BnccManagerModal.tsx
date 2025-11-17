import React, { useMemo } from 'react';
import { useData } from '../../context/DataContext';
import Modal from '../Modal';

interface BnccManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const BnccManagerModal: React.FC<BnccManagerModalProps> = ({ isOpen, onClose }) => {
  const { state, dispatch } = useData();

  const potentialBnccGroups = useMemo(() => {
    const disciplineCounts: Record<string, { turmas: Set<string> }> = {};
    state.disciplinas.forEach(d => {
      if (d.bnccId) return; // Ignore already grouped disciplines
      if (!disciplineCounts[d.nome]) {
        disciplineCounts[d.nome] = { turmas: new Set() };
      }
      disciplineCounts[d.nome].turmas.add(d.turmaId);
    });
    
    return Object.entries(disciplineCounts)
      .filter(([_, data]) => data.turmas.size > 1)
      .map(([nome, data]) => ({ nome, count: data.turmas.size }))
      .sort((a, b) => {
        if (b.count !== a.count) {
          return b.count - a.count;
        }
        return a.nome.localeCompare(b.nome);
      });
  }, [state.disciplinas]);

  const handleCreateBncc = (nome: string) => {
    dispatch({ type: 'CREATE_BNCC', payload: { nome } });
  };
  
  const handleDeleteBncc = (bnccId: string) => {
    dispatch({ type: 'DELETE_BNCC', payload: { bnccId } });
  };

  const baseButtonClass = "flex-shrink-0 w-32 justify-center text-center text-sm px-3 py-1 rounded-md transition-colors";

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Gerenciar Grupos BNCC" size="4xl">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gray-50 p-4 rounded-lg shadow-inner">
          <h3 className="text-lg font-semibold mb-3">Sugestões de Grupos BNCC</h3>
          <p className="text-sm text-gray-500 mb-3">Disciplinas com o mesmo nome em múltiplas turmas são candidatas a se tornarem um grupo BNCC.</p>
          {potentialBnccGroups.length > 0 ? (
            <ul className="divide-y divide-gray-200 max-h-96 overflow-y-auto pr-2">
              {potentialBnccGroups.map(group => (
                <li key={group.nome} className="py-3 flex justify-between items-center">
                  <div>
                    <span className="font-medium">{group.nome}</span>
                    <span className="text-sm text-gray-500 ml-2">({group.count} turmas)</span>
                  </div>
                  <button 
                    onClick={() => handleCreateBncc(group.nome)}
                    className={`${baseButtonClass} bg-green-500 text-white hover:bg-green-600`}
                  >
                    Criar Grupo
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-500">Nenhuma sugestão de grupo BNCC encontrada.</p>
          )}
        </div>
        <div className="bg-gray-50 p-4 rounded-lg shadow-inner">
          <h3 className="text-lg font-semibold mb-3">Grupos BNCC Atuais</h3>
           <p className="text-sm text-gray-500 mb-3">As atribuições de professores para estes grupos são feitas na aba "Atribuições".</p>
          {state.bncc.length > 0 ? (
            <ul className="divide-y divide-gray-200 max-h-96 overflow-y-auto pr-2">
              {state.bncc.map(bncc => (
                <li key={bncc.id} className="py-3 flex justify-between items-center">
                  <span className="font-medium">{bncc.nome}</span>
                  <button 
                    onClick={() => handleDeleteBncc(bncc.id)}
                    className={`${baseButtonClass} bg-red-500 text-white hover:bg-red-600`}
                  >
                    Desfazer Grupo
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-500">Nenhum grupo BNCC foi criado.</p>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default BnccManagerModal;