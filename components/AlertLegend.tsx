
import React from 'react';
import { ALERT_COLORS } from '../constants';
import { AlertType } from '../types';

const AlertLegend: React.FC = () => {
  return (
    <div className="px-4">
      <h3 className="text-sm font-semibold mb-2">Legenda de Alertas:</h3>
      <div className="flex flex-wrap gap-x-4 gap-y-2">
        <div key="valid-slot" className="flex items-center space-x-2 text-xs">
          <span className={`w-4 h-4 rounded-full bg-green-200 border border-gray-300`}></span>
          <span>Horário Válido (sem conflitos)</span>
        </div>
        {Object.keys(ALERT_COLORS).map((key) => {
          const alertType = key as AlertType;
          const { bg, name } = ALERT_COLORS[alertType];
          return (
            <div key={key} className="flex items-center space-x-2 text-xs">
              <span className={`w-4 h-4 rounded-full ${bg}`}></span>
              <span>{name}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AlertLegend;