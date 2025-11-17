import React from 'react';
import DashboardTooltipWrapper from './DashboardTooltipWrapper';

interface TurmaCompletionListProps {
    data: { id: string; nome: string; alocadas: number; total: number }[];
}

const TurmaCompletionList: React.FC<TurmaCompletionListProps> = ({ data }) => {
    return (
        <div className="bg-white p-4 rounded-lg shadow h-full flex flex-col">
            <DashboardTooltipWrapper tooltipText="Progresso de alocação de aulas para cada turma. Mostra quantas aulas já foram inseridas na grade em comparação com o total necessário para a turma.">
                <h3 className="text-lg font-bold text-gray-800 flex items-center gap-1 cursor-help">
                    Status de Preenchimento por Turma
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </h3>
            </DashboardTooltipWrapper>
            <div className="flex-1 overflow-y-auto pr-2 space-y-3 mt-4">
                {data.length > 0 ? data.map(turma => {
                    const percentage = turma.total > 0 ? (turma.alocadas / turma.total) * 100 : 0;
                    return (
                        <div key={turma.id}>
                            <div className="flex justify-between items-center text-sm mb-1">
                                <span className="font-medium text-gray-700 truncate" title={turma.nome}>{turma.nome}</span>
                                <span className="text-gray-500">{turma.alocadas.toFixed(2)} / {turma.total.toFixed(2)}</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2.5">
                                <div 
                                    className="bg-green-600 h-2.5 rounded-full transition-all duration-500"
                                    style={{ width: `${percentage}%` }}
                                ></div>
                            </div>
                        </div>
                    );
                }) : (
                     <div className="flex items-center justify-center h-full text-gray-500">
                        Nenhuma turma para exibir.
                    </div>
                )}
            </div>
        </div>
    );
};

export default TurmaCompletionList;
