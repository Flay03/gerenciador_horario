import React from 'react';
import DashboardTooltipWrapper from './DashboardTooltipWrapper';

interface OverviewStatsProps {
    completionPercentage: number;
    criticalAlerts: number;
    activeProfessors: number;
    totalTurmas: number;
}

const StatCard: React.FC<{ title: string; value: string; icon: React.ReactNode; colorClass: string; tooltipText: string }> = ({ title, value, icon, colorClass, tooltipText }) => (
    <div className="bg-white p-4 rounded-lg shadow flex items-center">
        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${colorClass} mr-4 flex-shrink-0`}>
            {icon}
        </div>
        <div>
             <DashboardTooltipWrapper tooltipText={tooltipText}>
                <div className="text-sm font-medium text-gray-500 flex items-center gap-1 cursor-help">
                    {title}
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </div>
            </DashboardTooltipWrapper>
            <div className="text-2xl font-bold text-gray-800">{value}</div>
        </div>
    </div>
);

const OverviewStats: React.FC<OverviewStatsProps> = ({ completionPercentage, criticalAlerts, activeProfessors, totalTurmas }) => {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard 
                title="Preenchimento da Grade"
                value={`${completionPercentage.toFixed(1)}%`}
                tooltipText="Percentual de aulas alocadas na grade em relação ao total de aulas semanais necessárias para todas as disciplinas desta modalidade."
                colorClass="bg-blue-100 text-blue-600"
                icon={
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                }
            />
            <StatCard 
                title="Alertas Críticos"
                value={String(criticalAlerts)}
                tooltipText="Número de conflitos de horário de professor (mesmo professor em duas turmas ao mesmo tempo). Estes são os alertas mais graves e devem ser resolvidos com prioridade."
                colorClass="bg-red-100 text-red-600"
                icon={
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                }
            />
            <StatCard 
                title="Professores Ativos"
                value={String(activeProfessors)}
                tooltipText="Número de professores únicos que possuem pelo menos uma aula alocada nesta grade de horários."
                colorClass="bg-green-100 text-green-600"
                icon={
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                }
            />
            <StatCard 
                title="Total de Turmas"
                value={String(totalTurmas)}
                tooltipText="Número total de turmas cadastradas para esta modalidade (Regular ou Modular)."
                colorClass="bg-purple-100 text-purple-600"
                icon={
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path d="M12 14l9-5-9-5-9 5 9 5z" />
                        <path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222 4 2.222V20" />
                    </svg>
                }
            />
        </div>
    );
};

export default OverviewStats;
