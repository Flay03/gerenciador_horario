import React, { useState, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { useGrid } from '../../context/GridContext';
import DraggableItem from './DraggableItem';
import { resolveBnccDiscipline } from '../../services/bnccHelper';
import { GridType } from '../../types';

interface SidebarProps {
  gridType: GridType;
}

const Sidebar: React.FC<SidebarProps> = ({ gridType }) => {
  const { state, dispatch } = useData();
  const { state: gridState, dispatch: gridDispatch } = useGrid();
  
  const { atribuicoes, disciplinas, professores, turmas } = state;
  const { draggedItem } = gridState;

  const [turmaFilter, setTurmaFilter] = useState<string>('all');
  const [searchText, setSearchText] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  
  const handleTurmaFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setTurmaFilter(e.target.value);
  };

  const getTurmaName = (turmaId: string) => turmas.find(t => t.id === turmaId)?.nome || 'N/A';

  const allocatedCounts = useMemo(() => {
    const counts: Record<string, Record<string, number>> = {}; 

    state.grade.forEach(slot => {
        const { finalDisciplinaId } = resolveBnccDiscipline(slot, state);
        const professorId = slot.professorId;
        
        const turma = state.turmas.find(t => t.id === slot.turmaId);
        const aulaValue = turma?.isModular ? 1.25 : 1;
        
        if (!counts[finalDisciplinaId]) {
            counts[finalDisciplinaId] = {};
        }
        
        counts[finalDisciplinaId][professorId] = (counts[finalDisciplinaId][professorId] || 0) + aulaValue;
    });

    return counts;
  }, [state]);

  const relevantTurmas = useMemo(() => {
    return turmas.filter(t => t.isModular === (gridType === 'modular'));
  }, [turmas, gridType]);
  
  const allProfessorAssignments = useMemo(() => {
    return atribuicoes.flatMap(atribuicao => {
      const disciplina = disciplinas.find(d => d.id === atribuicao.disciplinaId);
      if (!disciplina) return [];
  
      const turma = turmas.find(t => t.id === disciplina.turmaId);
      if (!turma || (turma.isModular !== (gridType === 'modular'))) {
        return [];
      }
      
      return atribuicao.professores.map((profId, index) => ({
          disciplina,
          professor: professores.find(p => p.id === profId),
          turmaId: disciplina.turmaId,
          assignmentIndex: index,
      }));
    }).filter(item => item.professor);
  }, [atribuicoes, disciplinas, turmas, professores, gridType]);


  const filteredItems = allProfessorAssignments.filter(item => {
      if (turmaFilter !== 'all' && item.turmaId !== turmaFilter) return false;
      if (searchText.trim() !== '' && !item.professor?.nome.toLowerCase().includes(searchText.toLowerCase())) return false;
      return true;
  });

  const onDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (draggedItem?.type === 'GRID_ITEM') {
      setIsDragOver(true);
      e.dataTransfer.dropEffect = 'move';
    } else {
      e.dataTransfer.dropEffect = 'none';
    }
  };

  const onDragLeave = () => {
    setIsDragOver(false);
  };

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    
    if (draggedItem?.type === 'GRID_ITEM' && draggedItem.sourceSlotId) {
      dispatch({ type: 'UPDATE_GRADE', payload: { id: draggedItem.sourceSlotId, slot: null } });
    }
    
    gridDispatch({ type: 'DRAG_END' });
  };


  return (
    <div 
      className={`p-4 h-full flex flex-col transition-colors duration-200 ${isDragOver ? 'bg-blue-200 border-2 border-dashed border-blue-500' : 'bg-gray-50'}`}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <h2 className="text-lg font-bold mb-4">Atribuições</h2>
      <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
        <div>
            <label htmlFor="search-professor" className="block text-sm font-medium text-gray-700">Buscar Professor</label>
            <input
              type="text"
              id="search-professor"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Digite o nome..."
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
            />
        </div>
        <div>
            <label htmlFor="turma-filter" className="block text-sm font-medium text-gray-700">Filtrar por Turma</label>
            <select
              id="turma-filter"
              value={turmaFilter}
              onChange={handleTurmaFilterChange}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
            >
              <option value="all">Ver Todas</option>
              {relevantTurmas.map(turma => (
                <option key={turma.id} value={turma.id}>{turma.nome}</option>
              ))}
            </select>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto space-y-2 pr-2">
        {filteredItems.map(item => {
          const { disciplina, professor, assignmentIndex } = item;
          if (!disciplina || !professor) return null;

          const allocatedCount = (allocatedCounts[disciplina.id] && allocatedCounts[disciplina.id][professor.id]) || 0;
          const totalAulas = disciplina.aulasSemanais;
          const isFullyAllocated = allocatedCount >= totalAulas;
          
          const dragId = `${disciplina.id}|${professor.id}`;
          const uniqueKey = `${disciplina.id}|${professor.id}|${assignmentIndex}`;
          
          const isBeingDragged =
            draggedItem?.type === 'SIDEBAR_ITEM' &&
            draggedItem.disciplinaId === disciplina.id &&
            draggedItem.professorId === professor.id;
            
          const label = (
            <span>
              {disciplina.nome}
              {disciplina.bnccId && (
                <span className="text-xs bg-pink-100 text-pink-800 font-semibold ml-2 px-2 py-0.5 rounded-full align-middle">
                  BNCC
                </span>
              )}
              {disciplina.divisao && (
                <span className="text-xs bg-blue-100 text-blue-800 font-semibold ml-2 px-2 py-0.5 rounded-full align-middle">
                  Divisão ({disciplina.numProfessores})
                </span>
              )}
              {` (${allocatedCount}/${totalAulas}) - ${professor.nome}`}
            </span>
          );

          const subLabel = `Turma: ${getTurmaName(disciplina.turmaId)}`;

          return (
            <DraggableItem 
              key={uniqueKey} 
              id={dragId} 
              label={label} 
              subLabel={subLabel}
              isLocked={isFullyAllocated}
              isBeingDragged={isBeingDragged}
            />
          );
        })}
      </div>
    </div>
  );
};

export default Sidebar;