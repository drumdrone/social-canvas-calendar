import React from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PlanTable } from '@/components/plan/PlanTable';

const Plan = () => {
  return (
    <AppLayout>
      <div className="flex-1 p-6 bg-background">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold text-foreground mb-6">Content Plan</h1>
          <PlanTable />
        </div>
      </div>
    </AppLayout>
  );
};

export default Plan;