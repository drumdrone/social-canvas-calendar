import React from 'react';
import { AppSidebar } from './AppSidebar';
import { RightCalendarColumn } from './RightCalendarColumn';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { useIsMobile } from '@/hooks/use-mobile';

interface AppLayoutProps {
  children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const isMobile = useIsMobile();

  return (
    <SidebarProvider defaultOpen={!isMobile}>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <main className="flex-1 flex flex-col overflow-hidden">
          <header className="h-12 flex items-center border-b border-border lg:hidden">
            <SidebarTrigger className="ml-2" />
            <h2 className="ml-2 text-lg font-semibold text-foreground">Social Media Manager</h2>
          </header>
          {children}
        </main>
        {/* Right Calendar Column - hidden on mobile */}
        {!isMobile && <RightCalendarColumn />}
      </div>
    </SidebarProvider>
  );
};