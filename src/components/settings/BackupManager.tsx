import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { api, convex } from '@/lib/convex';
import type { Id } from '../../../convex/_generated/dataModel';
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
  id: string;
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
      const data = await convex.query(api.backups.listBackups, {});

      setBackups(
        data.map((backup) => ({
          id: backup.id,
          name: backup.name,
          created_at: backup.created_at,
          size: backup.size ?? 0,
        }))
      );
    } catch (e) {
      console.error('Failed to load backups', e);
      toast.error('Nepodařilo se načíst seznam záloh.');
    } finally {
      setIsLoadingBackups(false);
    }
  };

  const handleBackup = async () => {
    setIsBackingUp(true);
    try {
      // The snapshot is built server-side in Convex, so nothing is streamed
      // through the browser.
      await convex.action(api.backups.create, {});

      setLastBackup(new Date().toLocaleString());
      toast.success('Záloha uložena do Convex storage.');
      await loadBackups();
    } catch (e) {
      console.error('Backup failed', e);
      toast.error('Zálohování selhalo. Zkuste to prosím znovu.');
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleImportClick = () => {
    if (!selectedBackup) {
      toast.error('Vyberte zálohu k obnovení.');
      return;
    }
    setShowImportDialog(true);
  };

  const handleImportConfirm = async () => {
    setShowImportDialog(false);
    setIsImporting(true);

    try {
      await convex.action(api.backups.restore, {
        id: selectedBackup as Id<'backups'>,
      });

      toast.success('Záloha byla obnovena!');
      window.location.reload();
    } catch (e) {
      console.error('Import failed', e);
      toast.error(`Obnovení selhalo: ${e instanceof Error ? e.message : 'neznámá chyba'}`);
    } finally {
      setIsImporting(false);
    }
  };

  const handleDeleteBackup = async (backupId: string) => {
    try {
      await convex.mutation(api.backups.remove, { id: backupId as Id<'backups'> });

      toast.success('Záloha smazána.');
      await loadBackups();
      if (selectedBackup === backupId) {
        setSelectedBackup('');
      }
    } catch (e) {
      console.error('Delete failed', e);
      toast.error('Zálohu se nepodařilo smazat.');
    }
  };

  const handleDownloadBackup = async (backupId: string) => {
    try {
      const url = await convex.query(api.backups.downloadUrl, {
        id: backupId as Id<'backups'>,
      });

      if (url) window.open(url, '_blank');
    } catch (e) {
      console.error('Download failed', e);
      toast.error('Zálohu se nepodařilo stáhnout.');
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Zálohy a export</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Kompletní záloha příspěvků, plánu a všech nastavení.
          </p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="h-4 w-4" />
            Zálohy jsou uložené v Convex storage
          </div>

          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-3">
              <Button onClick={handleBackup} disabled={isBackingUp}>
                <DownloadCloud className="h-4 w-4 mr-2" />
                {isBackingUp ? 'Vytvářím zálohu…' : 'Vytvořit zálohu'}
              </Button>
              {lastBackup && (
                <span className="text-xs text-muted-foreground">
                  Poslední záloha: {lastBackup}
                </span>
              )}
            </div>

            <div className="border-t pt-4 space-y-3">
              <div className="flex items-center gap-3">
                <Select value={selectedBackup} onValueChange={setSelectedBackup}>
                  <SelectTrigger className="flex-1">
                    <SelectValue
                      placeholder={
                        isLoadingBackups ? 'Načítám zálohy…' : 'Vyberte zálohu k obnovení'
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {backups.length === 0 ? (
                      <SelectItem value="none" disabled>
                        Žádné zálohy
                      </SelectItem>
                    ) : (
                      backups.map((backup) => (
                        <SelectItem key={backup.id} value={backup.id}>
                          {new Date(backup.created_at).toLocaleString()} (
                          {(backup.size / 1024).toFixed(1)} KB)
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
                  {isImporting ? 'Obnovuji…' : 'Obnovit'}
                </Button>
                {selectedBackup && (
                  <>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleDownloadBackup(selectedBackup)}
                      title="Stáhnout JSON"
                    >
                      <DownloadCloud className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="icon"
                      onClick={() => handleDeleteBackup(selectedBackup)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {backups.length} {backups.length === 1 ? 'záloha' : 'záloh'} k dispozici
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Obnovit zálohu</AlertDialogTitle>
            <AlertDialogDescription>
              Tímto se přepíšou všechna současná data vybranou zálohou. Akci nelze vzít
              zpět. Opravdu chcete pokračovat?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Zrušit</AlertDialogCancel>
            <AlertDialogAction onClick={handleImportConfirm}>
              Obnovit zálohu
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
