import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { DownloadCloud, ShieldCheck, Upload, Trash2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface BackupFile {
  name: string;
  created_at: string;
  size: number;
}

export const BackupManager: React.FC = () => {
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isLoadingBackups, setIsLoadingBackups] = useState(false);
  const [lastBackup, setLastBackup] = useState<string | null>(null);
  const [backups, setBackups] = useState<BackupFile[]>([]);
  const [selectedBackup, setSelectedBackup] = useState<string>('');
  const [showImportDialog, setShowImportDialog] = useState(false);

  useEffect(() => {
    loadBackups();
  }, []);

  const loadBackups = async () => {
    setIsLoadingBackups(true);
    try {
      const { data, error } = await supabase.storage
        .from('backups')
        .list('manual', {
          limit: 100,
          sortBy: { column: 'created_at', order: 'desc' },
        });

      if (error) throw error;

      const backupFiles = data
        .filter(file => file.name.endsWith('.json'))
        .map(file => ({
          name: file.name,
          created_at: file.created_at,
          size: file.metadata?.size || 0,
        }));

      setBackups(backupFiles);
    } catch (e: any) {
      console.error('Failed to load backups', e);
      toast.error('Failed to load backup list.');
    } finally {
      setIsLoadingBackups(false);
    }
  };

  const handleBackup = async () => {
    setIsBackingUp(true);
    try {
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
      toast.success('Backup saved to Supabase Storage.');
      await loadBackups();
    } catch (e: any) {
      console.error('Backup failed', e);
      toast.error('Backup failed. Please try again.');
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleImportClick = () => {
    if (!selectedBackup) {
      toast.error('Please select a backup to import.');
      return;
    }
    setShowImportDialog(true);
  };

  const handleImportConfirm = async () => {
    setShowImportDialog(false);
    setIsImporting(true);

    try {
      const { data: fileData, error: downloadError } = await supabase.storage
        .from('backups')
        .download(`manual/${selectedBackup}`);

      if (downloadError) throw downloadError;

      const text = await fileData.text();
      const backup = JSON.parse(text);

      if (!backup.data) {
        throw new Error('Invalid backup format');
      }

      const tables = [
        { name: 'social_media_posts', data: backup.data.social_media_posts },
        { name: 'plan_sections', data: backup.data.plan_sections },
        { name: 'platforms', data: backup.data.platforms },
        { name: 'post_statuses', data: backup.data.post_statuses },
        { name: 'categories', data: backup.data.categories },
        { name: 'product_lines', data: backup.data.product_lines },
        { name: 'pillars', data: backup.data.pillars },
        { name: 'formats', data: backup.data.formats },
      ];

      for (const table of tables) {
        if (table.data && Array.isArray(table.data) && table.data.length > 0) {
          const { error: deleteError } = await supabase
            .from(table.name)
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000');

          if (deleteError) {
            console.error(`Error clearing ${table.name}:`, deleteError);
          }

          const { error: insertError } = await supabase
            .from(table.name)
            .insert(table.data);

          if (insertError) {
            console.error(`Error importing ${table.name}:`, insertError);
            throw new Error(`Failed to import ${table.name}`);
          }
        }
      }

      toast.success('Backup imported successfully!');
      window.location.reload();
    } catch (e: any) {
      console.error('Import failed', e);
      toast.error(`Import failed: ${e.message}`);
    } finally {
      setIsImporting(false);
    }
  };

  const handleDeleteBackup = async (fileName: string) => {
    try {
      const { error } = await supabase.storage
        .from('backups')
        .remove([`manual/${fileName}`]);

      if (error) throw error;

      toast.success('Backup deleted successfully.');
      await loadBackups();
      if (selectedBackup === fileName) {
        setSelectedBackup('');
      }
    } catch (e: any) {
      console.error('Delete failed', e);
      toast.error('Failed to delete backup.');
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Backup & Export</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Create and restore full backups of posts, plan sections, and all settings.
          </p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="h-4 w-4" />
            Backups are stored securely in Supabase Storage
          </div>

          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-3">
              <Button onClick={handleBackup} disabled={isBackingUp}>
                <DownloadCloud className="h-4 w-4 mr-2" />
                {isBackingUp ? 'Creating Backup…' : 'Create Backup'}
              </Button>
              {lastBackup && (
                <span className="text-xs text-muted-foreground">Last backup: {lastBackup}</span>
              )}
            </div>

            <div className="border-t pt-4 space-y-3">
              <div className="flex items-center gap-3">
                <Select value={selectedBackup} onValueChange={setSelectedBackup}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder={isLoadingBackups ? "Loading backups..." : "Select backup to import"} />
                  </SelectTrigger>
                  <SelectContent>
                    {backups.length === 0 ? (
                      <SelectItem value="none" disabled>No backups available</SelectItem>
                    ) : (
                      backups.map((backup) => (
                        <SelectItem key={backup.name} value={backup.name}>
                          {new Date(backup.created_at).toLocaleString()} ({(backup.size / 1024).toFixed(1)} KB)
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                <Button
                  onClick={handleImportClick}
                  disabled={!selectedBackup || isImporting}
                  variant="secondary"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {isImporting ? 'Importing…' : 'Import'}
                </Button>
                {selectedBackup && (
                  <Button
                    variant="destructive"
                    size="icon"
                    onClick={() => handleDeleteBackup(selectedBackup)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {backups.length} backup{backups.length !== 1 ? 's' : ''} available
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Import Backup</AlertDialogTitle>
            <AlertDialogDescription>
              This will replace all current data with the selected backup. This action cannot be undone.
              Are you sure you want to continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleImportConfirm}>
              Import Backup
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default BackupManager;
