import React from 'react';

interface DashboardTooltipWrapperProps {
  tooltipText: string;
  children: React.ReactNode;
}

const DashboardTooltipWrapper: React.FC<DashboardTooltipWrapperProps> = ({ tooltipText, children }) => {
  return (
    <div className="relative group flex items-center">
      {children}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-2 text-xs text-white bg-gray-800 rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
        {tooltipText}
        <svg className="absolute text-gray-800 h-2 w-full left-0 top-full" x="0px" y="0px" viewBox="0 0 255 255">
            <polygon className="fill-current" points="0,0 127.5,127.5 255,0"/>
        </svg>
      </div>
    </div>
  );
};

export default DashboardTooltipWrapper;
