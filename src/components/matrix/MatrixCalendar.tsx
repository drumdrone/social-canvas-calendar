
import React, { useState } from 'react';
import { MatrixHeader } from './MatrixHeader';
import { MatrixGrid } from './MatrixGrid';

export const MatrixCalendar: React.FC = () => {
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

  const navigateYear = (direction: 'prev' | 'next') => {
    setCurrentYear(prev => direction === 'prev' ? prev - 1 : prev + 1);
  };

  return (
    <div className="h-full flex flex-col p-6">
      <MatrixHeader 
        currentYear={currentYear}
        onYearChange={navigateYear}
      />
      <MatrixGrid currentYear={currentYear} />
    </div>
  );
};
