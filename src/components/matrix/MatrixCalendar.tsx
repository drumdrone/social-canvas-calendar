
import React, { useState } from 'react';
import { MatrixHeader } from './MatrixHeader';
import { MatrixGrid } from './MatrixGrid';

export const MatrixCalendar: React.FC = () => {
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [currentQuarter, setCurrentQuarter] = useState(Math.floor(new Date().getMonth() / 3) + 1);

  const navigateYear = (direction: 'prev' | 'next') => {
    setCurrentYear(prev => direction === 'prev' ? prev - 1 : prev + 1);
  };

  const navigateQuarter = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      if (currentQuarter === 1) {
        setCurrentQuarter(4);
        setCurrentYear(prev => prev - 1);
      } else {
        setCurrentQuarter(prev => prev - 1);
      }
    } else {
      if (currentQuarter === 4) {
        setCurrentQuarter(1);
        setCurrentYear(prev => prev + 1);
      } else {
        setCurrentQuarter(prev => prev + 1);
      }
    }
  };

  return (
    <div className="h-full flex flex-col p-6">
      <MatrixHeader 
        currentYear={currentYear}
        currentQuarter={currentQuarter}
        onYearChange={navigateYear}
        onQuarterChange={navigateQuarter}
      />
      <MatrixGrid currentYear={currentYear} currentQuarter={currentQuarter} />
    </div>
  );
};
