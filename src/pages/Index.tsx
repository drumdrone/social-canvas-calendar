import React, { useState } from 'react';
import { Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SocialCalendar } from '@/components/SocialCalendar';
import { SettingsSidebar } from '@/components/settings/SettingsSidebar';
import { AppLayout } from '@/components/layout/AppLayout';

const Index = () => {
  const [showSettings, setShowSettings] = useState(false);

  return (
    <AppLayout>
      <div className="h-screen flex flex-col bg-background relative">
        {/* Settings Button */}
        <div className="absolute top-4 left-4 z-40">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSettings(true)}
            className="flex items-center gap-2"
          >
            <Settings className="h-4 w-4" />
            Settings
          </Button>
        </div>

        <SocialCalendar />

        <SettingsSidebar
          isOpen={showSettings}
          onClose={() => setShowSettings(false)}
        />
      </div>
    </AppLayout>
  );
};

export default Index;