import React from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { RecurringActionsGrid } from '@/components/plan/RecurringActionsGrid';
import { ActionTemplatesManager } from '@/components/plan/ActionTemplatesManager';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const Plan = () => {
  return (
    <AppLayout>
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Tabs defaultValue="instances" className="w-full h-full flex flex-col">
          <div className="border-b bg-white px-8">
            <TabsList className="h-12 bg-transparent border-b-0">
              <TabsTrigger value="templates" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">
                Šablony akcí
              </TabsTrigger>
              <TabsTrigger value="instances" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">
                Instance akcí
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="templates" className="flex-1 m-0">
            <ActionTemplatesManager />
          </TabsContent>

          <TabsContent value="instances" className="flex-1 m-0">
            <RecurringActionsGrid />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default Plan;