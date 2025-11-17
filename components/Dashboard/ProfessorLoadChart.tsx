import React from 'react';
import DashboardTooltipWrapper from './DashboardTooltipWrapper';

interface ProfessorLoadChartProps {
    data: { nome: string; aulas: number }[];
}

const ProfessorLoadChart: React.FC<ProfessorLoadChartProps> = ({ data }) => {
    const topProfessors = data.slice(0, 10);
    const maxAulas = Math.max(8, ...topProfessors.map(p => p.aulas));

    return (
        <div className="bg-white p-4 rounded-lg shadow h-full flex flex-col">
            <DashboardTooltipWrapper tooltipText="Exibe os professores com a maior quantidade de aulas alocadas. As cores indicam a carga: Normal (azul), Alta (amarelo, >6 aulas) ou Sobrecarga (vermelho, >8 aulas).">
                <h3 className="text-lg font-bold text-gray-800 flex items-center gap-1 cursor-help">
                    Carga Horária dos Professores (Top 10)
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </h3>
            </DashboardTooltipWrapper>
            <div className="flex-1 space-y-3 pr-4 mt-4">
                {topProfessors.length > 0 ? topProfessors.map((prof, index) => {
                    const barWidth = (prof.aulas / maxAulas) * 100;
                    let barColorClass = 'bg-blue-500';
                    if (prof.aulas > 8) {
                        barColorClass = 'bg-red-500';
                    } else if (prof.aulas > 6) {
                        barColorClass = 'bg-yellow-500';
                    }

                    return (
                        <div key={index} className="flex items-center gap-4 text-sm">
                            <div className="w-1/3 truncate text-gray-600" title={prof.nome}>{prof.nome}</div>
                            <div className="w-2/3 flex items-center">
                                <div className="w-full bg-gray-200 rounded-full h-5">
                                    <div 
                                        className={`h-5 rounded-full ${barColorClass} transition-all duration-500 ease-out`}
                                        style={{ width: `${barWidth}%` }}
                                    ></div>
                                </div>
                                <span className="ml-3 font-semibold text-gray-800 w-8 text-right">{prof.aulas}</span>
                            </div>
                        </div>
                    );
                }) : (
                    <div className="flex items-center justify-center h-full text-gray-500">
                        Nenhuma aula alocada na grade.
                    </div>
                )}
            </div>
        </div>
    );
};

export default ProfessorLoadChart;
