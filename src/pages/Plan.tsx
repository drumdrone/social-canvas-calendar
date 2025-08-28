import React from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PlanTable } from '@/components/plan/PlanTable';
import { DataRestoreButton } from '@/components/plan/DataRestoreButton';

const Plan = () => {
  return (
    <AppLayout>
      <div className="flex-1 p-6 bg-background">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-foreground">Content Plan</h1>
            <DataRestoreButton />
          </div>
          <PlanTable />
        </div>
      </div>
    </AppLayout>
  );
};

export default Plan;