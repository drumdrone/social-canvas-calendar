import React from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { MatrixCalendar } from '@/components/matrix/MatrixCalendar';

const Matrix = () => {
  return (
    <AppLayout>
      <div className="flex-1 flex flex-col bg-background">
        <div className="p-6 border-b">
          <h1 className="text-3xl font-bold text-foreground">Matrix</h1>
          <p className="text-muted-foreground mt-1">View activities in a spreadsheet-style calendar</p>
        </div>
        <div className="flex-1 overflow-hidden">
          <MatrixCalendar />
        </div>
      </div>
    </AppLayout>
  );
};

export default Matrix;