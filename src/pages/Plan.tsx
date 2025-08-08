import React from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { EditableTable } from '@/components/plan/EditableTable';

const Plan = () => {
  return (
    <AppLayout>
      <div className="flex-1 p-6 bg-background">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-foreground mb-6">Plan</h2>
          <EditableTable />
        </div>
      </div>
    </AppLayout>
  );
};

export default Plan;