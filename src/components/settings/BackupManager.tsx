import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { DownloadCloud, ShieldCheck } from 'lucide-react';

export const BackupManager: React.FC = () => {
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [lastBackup, setLastBackup] = useState<string | null>(null);

  const handleBackup = async () => {
    setIsBackingUp(true);
    try {
      // Fetch all relevant tables in parallel
      const [posts, planSections, platforms, statuses, categories, productLines, pillars, formats] = await Promise.all([
        supabase.from('social_media_posts').select('*'),
        supabase.from('plan_sections').select('*'),
        supabase.from('platforms').select('*'),
        supabase.from('post_statuses').select('*'),
        supabase.from('categories').select('*'),
        supabase.from('product_lines').select('*'),
        supabase.from('pillars').select('*'),
        supabase.from('formats').select('*'),
      ]);

      const timestamp = new Date().toISOString().replace(/:/g, '-');
      const payload = {
        meta: {
          created_at: new Date().toISOString(),
          app: 'Social Planner Backup',
          version: 1,
          counts: {
            social_media_posts: posts.data?.length || 0,
            plan_sections: planSections.data?.length || 0,
            platforms: platforms.data?.length || 0,
            post_statuses: statuses.data?.length || 0,
            categories: categories.data?.length || 0,
            product_lines: productLines.data?.length || 0,
            pillars: pillars.data?.length || 0,
            formats: formats.data?.length || 0,
          },
        },
        data: {
          social_media_posts: posts.data || [],
          plan_sections: planSections.data || [],
          platforms: platforms.data || [],
          post_statuses: statuses.data || [],
          categories: categories.data || [],
          product_lines: productLines.data || [],
          pillars: pillars.data || [],
          formats: formats.data || [],
        },
      };

      const filePath = `manual/backup-${timestamp}.json`;
      const json = JSON.stringify(payload, null, 2);
      const { error } = await supabase.storage
        .from('backups')
        .upload(filePath, new Blob([json], { type: 'application/json' }));

      if (error) throw error;

      setLastBackup(new Date().toLocaleString());
      toast.success('Backup saved to Supabase Storage (bucket: backups).');
    } catch (e: any) {
      console.error('Backup failed', e);
      toast.error('Backup failed. Please try again.');
    } finally {
      setIsBackingUp(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Backup & Export</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Create a full JSON backup of posts, plan sections, and all settings into Supabase Storage.
          </p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="h-4 w-4" />
            Private bucket: backups (you can download files from Supabase Storage UI).
          </div>
          <div className="flex items-center gap-3">
            <Button onClick={handleBackup} disabled={isBackingUp}>
              <DownloadCloud className="h-4 w-4 mr-2" />
              {isBackingUp ? 'Backing up…' : 'Create Backup'}
            </Button>
            {lastBackup && (
              <span className="text-xs text-muted-foreground">Last backup: {lastBackup}</span>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BackupManager;
