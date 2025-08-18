import React from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { MoodBoard } from '@/components/dashboard/MoodBoard';

const Dashboard = () => {
  return (
    <AppLayout>
      <div className="flex-1 flex flex-col bg-background">
        <div className="p-6 border-b">
          <h1 className="text-3xl font-bold text-foreground">Mood Board</h1>
          <p className="text-muted-foreground mt-1">Create and organize your creative ideas</p>
        </div>
        <div className="flex-1 overflow-hidden">
          <MoodBoard />
        </div>
      </div>
    </AppLayout>
  );
};

export default Dashboard;