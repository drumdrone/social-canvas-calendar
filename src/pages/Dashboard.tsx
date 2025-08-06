import React from 'react';
import { AppLayout } from '@/components/layout/AppLayout';

const Dashboard = () => {
  return (
    <AppLayout>
      <div className="flex-1 p-6 bg-background">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        </div>
      </div>
    </AppLayout>
  );
};

export default Dashboard;