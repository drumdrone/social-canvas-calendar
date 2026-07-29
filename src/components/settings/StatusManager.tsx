import React, { useState, useMemo } from 'react';
import { Plus, Trash2, Edit, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import { convexToTaxonomy, sortTaxonomyByName } from '@/integrations/convex/adapter';
import { toast } from 'sonner';

interface Status {
  id: Id<'post_statuses'>;
  name: string;
  color: string;
  is_active: boolean;
}

export const StatusManager: React.FC = () => {
  const raw = useQuery(api.taxonomy.listStatuses);
  const loading = raw === undefined;
  const statuses = useMemo<Status[]>(
    () => sortTaxonomyByName((raw ?? []).map((d) => convexToTaxonomy<Status>(d))),
    [raw],
  );
  const createStatus = useMutation(api.taxonomy.createStatus);
  const updateStatus = useMutation(api.taxonomy.updateStatus);
  const removeStatus = useMutation(api.taxonomy.removeStatus);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newStatus, setNewStatus] = useState({ name: '', color: '#6B7280' });

  const handleCreate = async () => {
    if (!newStatus.name.trim()) {
      toast.error('Status name is required');
      return;
    }
    try {
      await createStatus({ name: newStatus.name.toLowerCase(), color: newStatus.color });
      toast.success('Status created successfully!');
      setIsCreating(false);
      setNewStatus({ name: '', color: '#6B7280' });
      window.dispatchEvent(new CustomEvent('settingsChanged'));
    } catch (error) {
      console.error('Error creating status:', error);
      toast.error('Failed to create status');
    }
  };

  const handleUpdate = async (id: Id<'post_statuses'>, patch: Partial<Status>) => {
    try {
      await updateStatus({
        id,
        patch: {
          name: patch.name,
          color: patch.color,
          isActive: patch.is_active,
        },
      });
      toast.success('Status updated successfully!');
      setEditingId(null);
      window.dispatchEvent(new CustomEvent('settingsChanged'));
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    }
  };

  const handleDelete = async (id: Id<'post_statuses'>) => {
    if (!confirm('Are you sure you want to delete this status?')) return;
    try {
      await removeStatus({ id });
      toast.success('Status deleted successfully!');
      window.dispatchEvent(new CustomEvent('settingsChanged'));
    } catch (error) {
      console.error('Error deleting status:', error);
      toast.error('Failed to delete status');
    }
  };

  const toggleActive = async (status: Status) => {
    await handleUpdate(status.id, { is_active: !status.is_active });
  };

  if (loading) {
    return <div className="text-center py-4">Loading statuses...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Manage Statuses</h3>
        <Button size="sm" onClick={() => setIsCreating(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Add
        </Button>
      </div>

      {isCreating && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">New Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={newStatus.name}
                onChange={(e) => setNewStatus({ ...newStatus, name: e.target.value })}
                placeholder="e.g., reviewing"
              />
            </div>
            <div>
              <Label htmlFor="color">Color</Label>
              <Input
                id="color"
                type="color"
                value={newStatus.color}
                onChange={(e) => setNewStatus({ ...newStatus, color: e.target.value })}
              />
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleCreate}>
                <Save className="h-3 w-3 mr-1" />
                Save
              </Button>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => {
                  setIsCreating(false);
                  setNewStatus({ name: '', color: '#6B7280' });
                }}
              >
                <X className="h-3 w-3 mr-1" />
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        {statuses.map((status) => (
          <Card key={status.id} className={!status.is_active ? 'opacity-50' : ''}>
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full border"
                    style={{ backgroundColor: status.color }}
                  />
                  <span className="font-medium capitalize">{status.name}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant={status.is_active ? "default" : "outline"}
                    onClick={() => toggleActive(status)}
                  >
                    {status.is_active ? 'Active' : 'Inactive'}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDelete(status.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};