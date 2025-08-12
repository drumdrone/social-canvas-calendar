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
import { CategoryManager } from './CategoryManager';
import { ProductLineManager } from './ProductLineManager';
import { PillarManager } from './PillarManager';
import { FormatManager } from './FormatManager';
import { BackupManager } from './BackupManager';

interface SettingsSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsSidebar: React.FC<SettingsSidebarProps> = ({
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'platforms' | 'statuses' | 'categories' | 'productlines' | 'pillars' | 'formats' | 'backup'>('platforms');

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
          <div className="grid grid-cols-3 gap-1 mb-4">
            <Button
              variant={activeTab === 'platforms' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveTab('platforms')}
              className="text-xs"
            >
              Platforms
            </Button>
            <Button
              variant={activeTab === 'statuses' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveTab('statuses')}
              className="text-xs"
            >
              Statuses
            </Button>
            <Button
              variant={activeTab === 'categories' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveTab('categories')}
              className="text-xs"
            >
              Categories
            </Button>
            <Button
              variant={activeTab === 'productlines' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveTab('productlines')}
              className="text-xs"
            >
              Product Lines
            </Button>
            <Button
              variant={activeTab === 'pillars' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveTab('pillars')}
              className="text-xs"
            >
              Pillars
            </Button>
            <Button
              variant={activeTab === 'formats' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveTab('formats')}
              className="text-xs"
            >
              Formats
            </Button>
            <Button
              variant={activeTab === 'backup' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveTab('backup')}
              className="text-xs"
            >
              Backup
            </Button>
          </div>

          <ScrollArea className="h-[calc(100vh-140px)]">
            {activeTab === 'platforms' && <PlatformManager />}
            {activeTab === 'statuses' && <StatusManager />}
            {activeTab === 'categories' && <CategoryManager />}
            {activeTab === 'productlines' && <ProductLineManager />}
            {activeTab === 'pillars' && <PillarManager />}
            {activeTab === 'formats' && <FormatManager />}
            {activeTab === 'backup' && <BackupManager />}
          </ScrollArea>
        </div>
      </div>
    </div>
  );
};