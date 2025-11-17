

import React, { useState, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { Disciplina } from '../../types';
import ProfessorSelector from './ProfessorSelector';

const AtribuicoesManager: React.FC = () => {
  const { state, dispatch } = useData();
  const { disciplinas, professores, atribuicoes, turmas, cursos } = state;
  const [searchText, setSearchText] = useState('');
  
  const sortedProfessores = [...professores].sort((a, b) => a.nome.localeCompare(b.nome));
  const sortedCursos = [...cursos].sort((a,b) => a.nome.localeCompare(b.nome));

  const getAtribuicao = (disciplinaId: string): string[] => {
    return atribuicoes.find(a => a.disciplinaId === disciplinaId)?.professores || [];
  };

  const handleSelectionChange = (disciplinaId: string, newProfessorIds: string[]) => {
    if (newProfessorIds.length === 0) {
      dispatch({ type: 'DELETE_ATRIBUICAO', payload: { disciplinaId } });
    } else {
      dispatch({ type: 'UPDATE_ATRIBUICAO', payload: { disciplinaId, professores: newProfessorIds } });
    }
  };

  const searchResults = useMemo(() => {
    if (!searchText.trim()) {
        return null;
    }

    const lowerCaseSearch = searchText.toLowerCase();
    
    const matchingProfessors = sortedProfessores.filter(p => 
        p.nome.toLowerCase().includes(lowerCaseSearch)
    );
    
    const assignmentsByProfessor = matchingProfessors.map(prof => {
        const assignedDisciplinas = atribuicoes
            .filter(a => a.professores.includes(prof.id))
            .map(a => disciplinas.find(d => d.id === a.disciplinaId))
            .filter((d): d is Disciplina => !!d);

        return {
            professor: prof,
            disciplinas: assignedDisciplinas.sort((a,b) => a.nome.localeCompare(b.nome)),
        };
    }).filter(result => result.disciplinas.length > 0);

    return assignmentsByProfessor;

  }, [searchText, sortedProfessores, atribuicoes, disciplinas]);

  const renderDefaultView = () => (
      <>
        {sortedCursos.length > 0 ? (
          sortedCursos.map(curso => {
            const turmasDoCurso = turmas
              .filter(t => t.cursoId === curso.id)
              .sort((a,b) => a.nome.localeCompare(b.nome));
            
            if (turmasDoCurso.length === 0) return null;

            return (
              <div key={curso.id} className="bg-white p-4 rounded-lg shadow-md border border-gray-200">
                <h3 className="text-xl font-bold text-indigo-700 mb-4 pb-2 border-b">{curso.nome}</h3>
                <div className="space-y-6">
                  {turmasDoCurso.map(turma => {
                    const disciplinasDaTurma = disciplinas.filter(d => d.turmaId === turma.id).sort((a,b) => a.nome.localeCompare(b.nome));
                    if (disciplinasDaTurma.length === 0) return null;

                    return (
                      <div key={turma.id}>
                        <h4 className="text-lg font-semibold text-gray-800 flex items-center">
                          {turma.nome}
                           {turma.isModular && <span className="text-xs bg-purple-100 text-purple-800 font-semibold ml-2 px-2 py-0.5 rounded-full">Modular</span>}
                        </h4>
                        <div className="mt-2 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {disciplinasDaTurma.map(disciplina => (
                            <div key={disciplina.id} className="bg-gray-50 p-3 rounded-lg border">
                              <div className="mb-2">
                                <span className="text-sm font-bold text-gray-700">{disciplina.nome}</span>
                                {disciplina.bnccId && (
                                  <span className="ml-2 text-xs bg-pink-100 text-pink-800 font-semibold px-2 py-0.5 rounded-full">BNCC</span>
                                )}
                                {disciplina.divisao && (
                                  <span className="ml-2 text-xs bg-blue-100 text-blue-800 font-semibold px-2 py-0.5 rounded-full">
                                    Divisão ({disciplina.numProfessores})
                                  </span>
                                )}
                              </div>
                              <ProfessorSelector
                                allProfessors={sortedProfessores}
                                selectedProfessorIds={getAtribuicao(disciplina.id)}
                                onSelectionChange={(newIds) => handleSelectionChange(disciplina.id, newIds)}
                                maxSelection={disciplina.numProfessores}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center text-gray-500 py-8 bg-white rounded-lg shadow">
            Nenhum curso cadastrado. Por favor, adicione cursos na aba 'Cursos'.
          </div>
        )}
      </>
  );

  const renderSearchView = () => (
      <>
        {searchResults && searchResults.length > 0 ? (
           searchResults.map(({ professor, disciplinas: assignedDisciplinas }) => (
            <div key={professor.id} className="bg-white p-4 rounded-lg shadow-md border border-gray-200">
                <h3 className="text-xl font-bold text-indigo-700 mb-4 pb-2 border-b">{professor.nome}</h3>
                <div className="mt-2 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {assignedDisciplinas.map(disciplina => {
                        const turma = turmas.find(t => t.id === disciplina.turmaId);
                        const curso = cursos.find(c => c.id === turma?.cursoId);
                        return (
                            <div key={disciplina.id} className="bg-gray-50 p-3 rounded-lg border">
                                <div className="mb-1">
                                    <span className="text-sm font-bold text-gray-700">{disciplina.nome}</span>
                                    {disciplina.bnccId && (
                                      <span className="ml-2 text-xs bg-pink-100 text-pink-800 font-semibold px-2 py-0.5 rounded-full">BNCC</span>
                                    )}
                                    {disciplina.divisao && (
                                      <span className="ml-2 text-xs bg-blue-100 text-blue-800 font-semibold px-2 py-0.5 rounded-full">
                                        Divisão ({disciplina.numProfessores})
                                      </span>
                                    )}
                                </div>
                                <div className="text-xs text-gray-500 mb-2">
                                    {curso?.nome} / {turma?.nome}
                                </div>
                                <ProfessorSelector
                                    allProfessors={sortedProfessores}
                                    selectedProfessorIds={getAtribuicao(disciplina.id)}
                                    onSelectionChange={(newIds) => handleSelectionChange(disciplina.id, newIds)}
                                    maxSelection={disciplina.numProfessores}
                                />
                            </div>
                        );
                    })}
                </div>
            </div>
           ))
        ) : (
          <div className="text-center text-gray-500 py-8 bg-white rounded-lg shadow">
             Nenhum professor encontrado com o nome "{searchText}" que possua atribuições.
          </div>
        )}
      </>
  );


  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Gerenciar Atribuições</h2>
         <div className="w-64">
            <label htmlFor="professor-search-atribuicao" className="block text-sm font-medium text-gray-700">
              Buscar por Professor
            </label>
            <input
              type="text"
              id="professor-search-atribuicao"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Digite o nome..."
              className="mt-1 block w-full pl-3 pr-3 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
            />
        </div>
      </div>
      
      <div className="space-y-8">
        {searchText.trim() ? renderSearchView() : renderDefaultView()}
      </div>
    </div>
  );
};

export default AtribuicoesManager;