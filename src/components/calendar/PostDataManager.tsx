import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Download, Upload, FileText, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface PostDataManagerProps {
  onImportComplete?: () => void;
}

export const PostDataManager: React.FC<PostDataManagerProps> = ({ onImportComplete }) => {
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importStats, setImportStats] = useState<{
    total: number;
    successful: number;
    failed: number;
    errors: string[];
  } | null>(null);
  const { toast } = useToast();

  const handleExport = async () => {
    setExporting(true);
    try {
      const { data: posts, error } = await supabase
        .from('social_media_posts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Include metadata
      const exportData = {
        exportedAt: new Date().toISOString(),
        totalPosts: posts?.length || 0,
        posts: posts || [],
        version: '1.0',
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json',
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `social-media-posts-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: 'Export Complete',
        description: `Exported ${posts?.length || 0} posts successfully`,
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: 'Export Failed',
        description: 'Failed to export posts',
        variant: 'destructive',
      });
    } finally {
      setExporting(false);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'application/json') {
      setImportFile(file);
    } else {
      toast({
        title: 'Invalid File',
        description: 'Please select a valid JSON file',
        variant: 'destructive',
      });
    }
  };

  const handleImport = async () => {
    if (!importFile) return;

    setImporting(true);
    setImportStats(null);

    try {
      const fileContent = await importFile.text();
      const importData = JSON.parse(fileContent);

      // Validate file structure
      if (!importData.posts || !Array.isArray(importData.posts)) {
        throw new Error('Invalid file format: posts array not found');
      }

      const posts = importData.posts;
      const stats = {
        total: posts.length,
        successful: 0,
        failed: 0,
        errors: [] as string[],
      };

      // Process posts in batches to avoid overwhelming the database
      const batchSize = 10;
      for (let i = 0; i < posts.length; i += batchSize) {
        const batch = posts.slice(i, i + batchSize);
        
        for (const post of batch) {
          try {
            // Clean and validate post data
            const cleanPost = {
              title: post.title || 'Imported Post',
              content: post.content || null,
              platform: post.platform || 'facebook',
              category: post.category || 'Image',
              pillar: post.pillar || null,
              product_line: post.product_line || null,
              status: post.status || 'draft',
              scheduled_date: post.scheduled_date || new Date().toISOString(),
              image_url: post.image_url || null,
              // Don't import user_id - will be set by trigger
            };

            const { error } = await supabase
              .from('social_media_posts')
              .insert([cleanPost]);

            if (error) {
              stats.failed++;
              stats.errors.push(`Post "${cleanPost.title}": ${error.message}`);
            } else {
              stats.successful++;
            }
          } catch (postError) {
            stats.failed++;
            stats.errors.push(`Post processing error: ${postError}`);
          }
        }
      }

      setImportStats(stats);

      if (stats.successful > 0) {
        toast({
          title: 'Import Complete',
          description: `Successfully imported ${stats.successful} of ${stats.total} posts`,
        });
        onImportComplete?.();
      } else {
        toast({
          title: 'Import Failed',
          description: 'No posts were successfully imported',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Import error:', error);
      toast({
        title: 'Import Failed',
        description: error instanceof Error ? error.message : 'Failed to import posts',
        variant: 'destructive',
      });
    } finally {
      setImporting(false);
      setImportFile(null);
      // Reset file input
      const fileInput = document.getElementById('import-file') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
    }
  };

  return (
    <div className="flex gap-2">
      {/* Export Button */}
      <Button
        onClick={handleExport}
        disabled={exporting}
        variant="outline"
        className="flex items-center gap-2"
      >
        <Download className="h-4 w-4" />
        {exporting ? 'Exporting...' : 'Export JSON'}
      </Button>

      {/* Import Dialog */}
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="outline" className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Import JSON
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Import Posts from JSON
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Import posts from a JSON file. Existing posts won't be affected.
              </AlertDescription>
            </Alert>

            <div>
              <Label htmlFor="import-file">Select JSON File</Label>
              <Input
                id="import-file"
                type="file"
                accept=".json,application/json"
                onChange={handleFileUpload}
                className="mt-1"
              />
            </div>

            {importFile && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Selected File</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-sm text-muted-foreground">{importFile.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(importFile.size / 1024).toFixed(1)} KB
                  </p>
                </CardContent>
              </Card>
            )}

            {importStats && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Import Results</CardTitle>
                </CardHeader>
                <CardContent className="pt-0 space-y-2">
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div>
                      <span className="font-medium">Total:</span> {importStats.total}
                    </div>
                    <div className="text-green-600">
                      <span className="font-medium">Success:</span> {importStats.successful}
                    </div>
                    <div className="text-red-600">
                      <span className="font-medium">Failed:</span> {importStats.failed}
                    </div>
                  </div>
                  
                  {importStats.errors.length > 0 && (
                    <div className="max-h-32 overflow-y-auto">
                      <p className="text-xs font-medium text-muted-foreground mb-1">Errors:</p>
                      {importStats.errors.slice(0, 5).map((error, index) => (
                        <p key={index} className="text-xs text-red-600">{error}</p>
                      ))}
                      {importStats.errors.length > 5 && (
                        <p className="text-xs text-muted-foreground">
                          ... and {importStats.errors.length - 5} more errors
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            <div className="flex gap-2">
              <Button
                onClick={handleImport}
                disabled={!importFile || importing}
                className="flex-1"
              >
                {importing ? 'Importing...' : 'Import Posts'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};