import React from 'react';

interface ProgressBarProps {
  progress: number; // 0 to 100
  label?: string;
  colorClass?: string;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ progress, label, colorClass = 'bg-indigo-600' }) => {
  return (
    <div className="w-full">
      {label && (
        <div className="flex justify-between mb-1 text-sm font-medium text-gray-700">
          <span>{label}</span>
          <span>{Math.round(progress)}%</span>
        </div>
      )}
      <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
        <div 
          className={`h-2.5 rounded-full transition-all duration-300 ease-out ${colorClass}`} 
          style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
        ></div>
      </div>
    </div>
  );
};

export default ProgressBar;