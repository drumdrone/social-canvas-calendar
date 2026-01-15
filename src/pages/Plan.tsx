import React from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { RecurringActionsGrid } from '@/components/plan/RecurringActionsGrid';

const Plan = () => {
  return (
    <AppLayout>
      <div className="min-h-screen flex flex-col bg-background">
        <RecurringActionsGrid />
      </div>
    </AppLayout>
  );
};

export default Plan;