import React from 'react';
import DashboardTooltipWrapper from './DashboardTooltipWrapper';

interface PeriodDistributionChartProps {
    data: { manha: number; tarde: number; noite: number };
}

const PeriodDistributionChart: React.FC<PeriodDistributionChartProps> = ({ data }) => {
    const { manha, tarde, noite } = data;
    const total = manha + tarde + noite;
    const max = total > 0 ? Math.max(manha, tarde, noite) : 1;

    const Bar: React.FC<{ label: string; value: number; colorClass: string }> = ({ label, value, colorClass }) => {
        const heightPercentage = max > 0 ? (value / max) * 100 : 0;
        return (
            <div className="flex flex-col items-center flex-1">
                <div className="w-full h-40 flex items-end justify-center">
                    <div 
                        className={`w-10 rounded-t-md ${colorClass} transition-all duration-500 ease-out`}
                        style={{ height: `${heightPercentage}%` }}
                        title={`${label}: ${value} aulas`}
                    ></div>
                </div>
                <div className="text-xs font-semibold text-gray-600 mt-2">{label}</div>
                 <div className="text-sm font-bold text-gray-800">{value}</div>
            </div>
        );
    };

    return (
        <div className="bg-white p-4 rounded-lg shadow h-full flex flex-col">
            <DashboardTooltipWrapper tooltipText="Distribuição do número de aulas alocadas em cada período. Ajuda a visualizar o equilíbrio da ocupação da grade entre manhã, tarde e noite.">
                 <h3 className="text-lg font-bold text-gray-800 flex items-center gap-1 cursor-help">
                    Ocupação por Período
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </h3>
            </DashboardTooltipWrapper>
            <div className="flex-1 flex items-end justify-around gap-4 mt-4">
                <Bar label="Manhã" value={manha} colorClass="bg-yellow-400" />
                <Bar label="Tarde" value={tarde} colorClass="bg-blue-400" />
                <Bar label="Noite" value={noite} colorClass="bg-indigo-500" />
            </div>
        </div>
    );
};

export default PeriodDistributionChart;
