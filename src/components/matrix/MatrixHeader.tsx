
import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';

interface MatrixHeaderProps {
  currentYear: number;
  currentQuarter: number;
  onYearChange: (direction: 'prev' | 'next') => void;
  onQuarterChange: (direction: 'prev' | 'next') => void;
}

export const MatrixHeader: React.FC<MatrixHeaderProps> = ({
  currentYear,
  currentQuarter,
  onYearChange,
  onQuarterChange,
}) => {
  const quarterNames = ['Q1', 'Q2', 'Q3', 'Q4'];
  
  return (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={() => onQuarterChange('prev')}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-xl font-semibold">
          {quarterNames[currentQuarter - 1]} {currentYear}
        </h2>
        <Button variant="outline" size="sm" onClick={() => onQuarterChange('next')}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};
