
import React, { ReactNode } from 'react';

interface TooltipProps {
  children: ReactNode;
  content: ReactNode | null;
  isVisible: boolean;
  onVisibilityChange: (visible: boolean) => void;
}

const Tooltip: React.FC<TooltipProps> = ({ children, content, isVisible, onVisibilityChange }) => {

  if (!content) {
    return <>{children}</>;
  }

  return (
    <div
      className="relative"
      onMouseEnter={() => onVisibilityChange(true)}
      onMouseLeave={() => onVisibilityChange(false)}
    >
      {children}
      {isVisible && (
        <div className="absolute z-50 bottom-full mb-2 w-64 p-2 text-sm text-white bg-gray-800 rounded-md shadow-lg">
          {content}
        </div>
      )}
    </div>
  );
};

export default Tooltip;
