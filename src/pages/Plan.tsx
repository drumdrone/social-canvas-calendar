import React from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { RecurringActionsGrid } from '@/components/plan/RecurringActionsGrid';
import { ActionTemplatesManager } from '@/components/plan/ActionTemplatesManager';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const Plan = () => {
  return (
    <AppLayout>
      <div className="min-h-screen flex flex-col bg-background p-6">
        <Tabs defaultValue="instances" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="templates">Šablony akcí</TabsTrigger>
            <TabsTrigger value="instances">Instance akcí</TabsTrigger>
          </TabsList>

          <TabsContent value="templates" className="space-y-6">
            <ActionTemplatesManager />
          </TabsContent>

          <TabsContent value="instances" className="space-y-6">
            <RecurringActionsGrid />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default Plan;