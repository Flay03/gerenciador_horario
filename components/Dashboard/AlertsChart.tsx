import React from 'react';
import { AlertType } from '../../types';
import { ALERT_COLORS } from '../../constants';
import DashboardTooltipWrapper from './DashboardTooltipWrapper';

interface AlertsChartProps {
    data: Record<AlertType, number>;
}

const DonutChart: React.FC<{ segments: { value: number; color: string }[] }> = ({ segments }) => {
    const total = segments.reduce((sum, seg) => sum + seg.value, 0);
    if (total === 0) {
        return (
            <div className="flex items-center justify-center h-full">
                <svg className="w-48 h-48 transform -rotate-90" viewBox="0 0 120 120">
                    <circle cx="60" cy="60" r="50" fill="none" stroke="#e5e7eb" strokeWidth="20" />
                    <text x="60" y="60" textAnchor="middle" dominantBaseline="central" className="transform rotate-90" fontSize="14" fill="#9ca3af">Sem Alertas</text>
                </svg>
            </div>
        );
    }
    
    const radius = 50;
    const circumference = 2 * Math.PI * radius;
    let offset = 0;

    return (
        <svg className="w-48 h-48 transform -rotate-90" viewBox="0 0 120 120">
            {segments.map((segment, index) => {
                const dash = (segment.value / total) * circumference;
                const segmentElement = (
                    <circle
                        key={index}
                        cx="60"
                        cy="60"
                        r={radius}
                        fill="none"
                        stroke={segment.color}
                        strokeWidth="20"
                        strokeDasharray={`${dash} ${circumference}`}
                        strokeDashoffset={-offset}
                    />
                );
                offset += dash;
                return segmentElement;
            })}
        </svg>
    );
};

const AlertsChart: React.FC<AlertsChartProps> = ({ data }) => {
    const segments = Object.entries(data).map(([type, value]) => ({
        type: type as AlertType,
        value: value as number, // Cast value to number to fix TypeScript error
        color: ALERT_COLORS[type as AlertType].bg.replace('bg-', ''),
        name: ALERT_COLORS[type as AlertType].name,
    }));

    // Convert Tailwind bg color class to hex for SVG
    const colorMap: Record<string, string> = {
        'pink-600': '#db2777',
        'blue-500': '#3b82f6',
        'red-600': '#dc2626',
        'orange-400': '#fb923c',
        'purple-500': '#a855f7',
        'yellow-400': '#facc15',
    };
    
    const chartSegments = segments.map(s => ({ value: s.value, color: colorMap[s.color] || '#9ca3af' }));
    const totalAlerts = segments.reduce((sum, s) => sum + s.value, 0);

    return (
        <div className="bg-white p-4 rounded-lg shadow h-full flex flex-col">
            <DashboardTooltipWrapper tooltipText="Distribuição dos tipos de alertas encontrados na grade. Alertas são problemas como conflitos de horário, excesso de aulas, etc.">
                <h3 className="text-lg font-bold text-gray-800 flex items-center gap-1 cursor-help">
                    Análise de Alertas
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </h3>
            </DashboardTooltipWrapper>
            <div className="flex-1 flex flex-col md:flex-row items-center gap-4 mt-4">
                <div className="relative">
                    <DonutChart segments={chartSegments} />
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-3xl font-bold text-gray-800">{totalAlerts}</span>
                        <span className="text-sm text-gray-500">Total</span>
                    </div>
                </div>
                <div className="flex-1 space-y-2 text-sm w-full">
                    {segments.sort((a,b) => b.value - a.value).map(segment => (
                        <div key={segment.type} className="flex items-center justify-between">
                            <div className="flex items-center">
                                <span className={`w-3 h-3 rounded-full mr-2 ${ALERT_COLORS[segment.type].bg}`}></span>
                                <span className="text-gray-600">{segment.name}</span>
                            </div>
                            <span className="font-semibold text-gray-800">{segment.value}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default AlertsChart;