import React, { useState } from 'react';
import { Settings, X, Plus, Trash2, Palette } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PlatformManager } from './PlatformManager';
import { StatusManager } from './StatusManager';

interface SettingsSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsSidebar: React.FC<SettingsSidebarProps> = ({
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'platforms' | 'statuses'>('platforms');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm">
      <div className="fixed left-0 top-0 h-full w-96 bg-background border-r shadow-xl">
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            <h2 className="text-lg font-semibold">Settings</h2>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="p-4">
          <div className="flex gap-2 mb-4">
            <Button
              variant={activeTab === 'platforms' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveTab('platforms')}
              className="flex-1"
            >
              Platforms
            </Button>
            <Button
              variant={activeTab === 'statuses' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveTab('statuses')}
              className="flex-1"
            >
              Statuses
            </Button>
          </div>

          <ScrollArea className="h-[calc(100vh-140px)]">
            {activeTab === 'platforms' && <PlatformManager />}
            {activeTab === 'statuses' && <StatusManager />}
          </ScrollArea>
        </div>
      </div>
    </div>
  );
};