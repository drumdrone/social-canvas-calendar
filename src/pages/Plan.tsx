import React from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PlanTable } from '@/components/plan/PlanTable';
import { useAuth } from '@/contexts/AuthContext';
import Login from './Login';

const Plan = () => {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Login />;
  }

  return (
    <AppLayout>
      <div className="h-screen flex flex-col bg-background">
        <PlanTable />
      </div>
    </AppLayout>
  );
};

export default Plan;