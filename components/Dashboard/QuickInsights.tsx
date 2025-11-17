import React from 'react';
import { Disciplina, Professor } from '../../types';
import DashboardTooltipWrapper from './DashboardTooltipWrapper';

interface QuickInsightsProps {
    unassignedDisciplines: Disciplina[];
    unassignedProfessors: Professor[];
}

const QuickInsights: React.FC<QuickInsightsProps> = ({ unassignedDisciplines, unassignedProfessors }) => {
    return (
        <div className="bg-white p-4 rounded-lg shadow h-full flex flex-col">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Insights Rápidos</h3>
            <div className="flex-1 space-y-4 overflow-y-auto">
                <div>
                    <DashboardTooltipWrapper tooltipText="Lista de disciplinas da grade selecionada (Regular ou Modular) que ainda não têm nenhum professor atribuído na tela de Gerenciamento.">
                        <h4 className="font-semibold text-gray-700 flex items-center cursor-help">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Disciplinas Sem Atribuição ({unassignedDisciplines.length})
                        </h4>
                    </DashboardTooltipWrapper>
                    {unassignedDisciplines.length > 0 ? (
                        <ul className="mt-2 text-sm text-gray-600 list-disc list-inside pl-7 max-h-24 overflow-y-auto">
                            {unassignedDisciplines.map(d => <li key={d.id} className="truncate" title={d.nome}>{d.nome}</li>)}
                        </ul>
                    ) : (
                        <p className="mt-1 text-sm text-gray-500 pl-7">Todas as disciplinas foram atribuídas.</p>
                    )}
                </div>

                <div>
                    <DashboardTooltipWrapper tooltipText="Lista de professores cadastrados no sistema que não foram atribuídos a NENHUMA disciplina, seja na grade Regular ou na Modular. Ajuda a identificar professores pendentes de configuração.">
                        <h4 className="font-semibold text-gray-700 flex items-center cursor-help">
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Professores Sem Aulas ({unassignedProfessors.length})
                        </h4>
                    </DashboardTooltipWrapper>
                    {unassignedProfessors.length > 0 ? (
                        <ul className="mt-2 text-sm text-gray-600 list-disc list-inside pl-7 max-h-24 overflow-y-auto">
                            {unassignedProfessors.map(p => <li key={p.id} className="truncate" title={p.nome}>{p.nome}</li>)}
                        </ul>
                    ) : (
                        <p className="mt-1 text-sm text-gray-500 pl-7">Todos os professores foram atribuídos a alguma disciplina.</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default QuickInsights;
