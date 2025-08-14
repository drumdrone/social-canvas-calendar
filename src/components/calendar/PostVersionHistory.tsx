import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, RotateCcw, Save } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface PostVersion {
  version_id: string;
  version_number: number;
  title: string;
  content?: string;
  platform: string;
  category: string;
  pillar?: string;
  product_line?: string;
  status: string;
  scheduled_date: string;
  image_url?: string;
  created_at: string;
  backup_reason: string;
}

interface PostVersionHistoryProps {
  postId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onRestore?: () => void;
}

export const PostVersionHistory: React.FC<PostVersionHistoryProps> = ({
  postId,
  isOpen,
  onClose,
  onRestore
}) => {
  const [versions, setVersions] = useState<PostVersion[]>([]);
  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState<number | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen && postId) {
      fetchVersions();
    }
  }, [isOpen, postId]);

  const fetchVersions = async () => {
    if (!postId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_post_versions', {
        p_post_id: postId
      });

      if (error) throw error;
      setVersions(data || []);
    } catch (error) {
      console.error('Error fetching versions:', error);
      toast({
        title: 'Error',
        description: 'Failed to load version history',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (versionNumber: number) => {
    if (!postId) return;

    setRestoring(versionNumber);
    try {
      const { data, error } = await supabase.rpc('restore_post_from_backup', {
        p_post_id: postId,
        p_version_number: versionNumber
      });

      if (error) throw error;

      toast({
        title: 'Success',
        description: `Post restored to version ${versionNumber}`,
      });

      onRestore?.();
      onClose();
    } catch (error) {
      console.error('Error restoring version:', error);
      toast({
        title: 'Error',
        description: 'Failed to restore version',
        variant: 'destructive',
      });
    } finally {
      setRestoring(null);
    }
  };

  const handleCreateBackup = async () => {
    if (!postId) return;

    try {
      const { data, error } = await supabase.rpc('create_post_backup', {
        p_post_id: postId,
        p_backup_reason: 'manual_backup'
      });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Manual backup created successfully',
      });

      fetchVersions(); // Refresh the list
    } catch (error) {
      console.error('Error creating backup:', error);
      toast({
        title: 'Error',
        description: 'Failed to create backup',
        variant: 'destructive',
      });
    }
  };

  const getReasonBadgeColor = (reason: string) => {
    switch (reason) {
      case 'auto_backup_on_update':
        return 'bg-blue-100 text-blue-800';
      case 'auto_backup_before_restore':
        return 'bg-yellow-100 text-yellow-800';
      case 'manual_backup':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getReasonLabel = (reason: string) => {
    switch (reason) {
      case 'auto_backup_on_update':
        return 'Auto (Update)';
      case 'auto_backup_before_restore':
        return 'Auto (Restore)';
      case 'manual_backup':
        return 'Manual';
      default:
        return reason;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Post Version History
          </DialogTitle>
        </DialogHeader>

        <div className="flex gap-4 mb-4">
          <Button onClick={handleCreateBackup} variant="outline" className="flex items-center gap-2">
            <Save className="h-4 w-4" />
            Create Manual Backup
          </Button>
        </div>

        <ScrollArea className="h-[60vh]">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-muted-foreground">Loading version history...</div>
            </div>
          ) : versions.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-muted-foreground">No versions found</div>
            </div>
          ) : (
            <div className="space-y-4">
              {versions.map((version) => (
                <Card key={version.version_id} className="border-l-4 border-l-primary">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg flex items-center gap-2">
                        Version {version.version_number}
                        <Badge 
                          variant="secondary" 
                          className={getReasonBadgeColor(version.backup_reason)}
                        >
                          {getReasonLabel(version.backup_reason)}
                        </Badge>
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">
                          {format(new Date(version.created_at), 'MMM dd, yyyy HH:mm')}
                        </span>
                        <Button
                          onClick={() => handleRestore(version.version_number)}
                          disabled={restoring === version.version_number}
                          size="sm"
                          variant="outline"
                          className="flex items-center gap-1"
                        >
                          <RotateCcw className="h-3 w-3" />
                          {restoring === version.version_number ? 'Restoring...' : 'Restore'}
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                      <div>
                        <span className="text-sm font-medium text-muted-foreground">Platform:</span>
                        <p className="text-sm">{version.platform}</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-muted-foreground">Category:</span>
                        <p className="text-sm">{version.category}</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-muted-foreground">Status:</span>
                        <p className="text-sm capitalize">{version.status}</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-muted-foreground">Scheduled:</span>
                        <p className="text-sm">
                          {format(new Date(version.scheduled_date), 'MMM dd, yyyy')}
                        </p>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div>
                        <span className="text-sm font-medium text-muted-foreground">Title:</span>
                        <p className="text-sm font-medium">{version.title}</p>
                      </div>
                      {version.content && (
                        <div>
                          <span className="text-sm font-medium text-muted-foreground">Content:</span>
                          <p className="text-sm text-muted-foreground line-clamp-3">
                            {version.content}
                          </p>
                        </div>
                      )}
                      {version.pillar && (
                        <div>
                          <span className="text-sm font-medium text-muted-foreground">Pillar:</span>
                          <p className="text-sm">{version.pillar}</p>
                        </div>
                      )}
                      {version.product_line && (
                        <div>
                          <span className="text-sm font-medium text-muted-foreground">Product Line:</span>
                          <p className="text-sm">{version.product_line}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};