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

interface Format {
  id: Id<'formats'>;
  name: string;
  color: string;
  is_active: boolean;
}

export const FormatManager: React.FC = () => {
  const raw = useQuery(api.taxonomy.listFormats);
  const loading = raw === undefined;
  const formats = useMemo<Format[]>(
    () => sortTaxonomyByName((raw ?? []).map((d) => convexToTaxonomy<Format>(d))),
    [raw],
  );
  const createFormat = useMutation(api.taxonomy.createFormat);
  const updateFormat = useMutation(api.taxonomy.updateFormat);
  const removeFormat = useMutation(api.taxonomy.removeFormat);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newFormat, setNewFormat] = useState({ name: '', color: '#3B82F6' });

  const handleCreate = async () => {
    if (!newFormat.name.trim()) {
      toast.error('Format name is required');
      return;
    }
    try {
      await createFormat({ name: newFormat.name.toLowerCase(), color: newFormat.color });
      toast.success('Format created successfully!');
      setIsCreating(false);
      setNewFormat({ name: '', color: '#3B82F6' });
      window.dispatchEvent(new CustomEvent('settingsChanged'));
    } catch (error) {
      console.error('Error creating format:', error);
      toast.error('Failed to create format');
    }
  };

  const handleUpdate = async (id: Id<'formats'>, patch: Partial<Format>) => {
    try {
      await updateFormat({
        id,
        patch: { name: patch.name, color: patch.color, isActive: patch.is_active },
      });
      toast.success('Format updated successfully!');
      setEditingId(null);
      window.dispatchEvent(new CustomEvent('settingsChanged'));
    } catch (error) {
      console.error('Error updating format:', error);
      toast.error('Failed to update format');
    }
  };

  const handleDelete = async (id: Id<'formats'>) => {
    if (!confirm('Are you sure you want to delete this format?')) return;
    try {
      await removeFormat({ id });
      toast.success('Format deleted successfully!');
      window.dispatchEvent(new CustomEvent('settingsChanged'));
    } catch (error) {
      console.error('Error deleting format:', error);
      toast.error('Failed to delete format');
    }
  };

  const toggleActive = async (format: Format) => {
    await handleUpdate(format.id, { is_active: !format.is_active });
  };

  if (loading) {
    return <div className="text-center py-4">Loading formats...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Manage Formats</h3>
        <Button size="sm" onClick={() => setIsCreating(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Add
        </Button>
      </div>

      {isCreating && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">New Format</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={newFormat.name}
                onChange={(e) => setNewFormat({ ...newFormat, name: e.target.value })}
                placeholder="e.g., image"
              />
            </div>
            <div>
              <Label htmlFor="color">Color</Label>
              <Input
                id="color"
                type="color"
                value={newFormat.color}
                onChange={(e) => setNewFormat({ ...newFormat, color: e.target.value })}
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
                  setNewFormat({ name: '', color: '#3B82F6' });
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
        {formats.map((format) => (
          <Card key={format.id} className={!format.is_active ? 'opacity-50' : ''}>
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full border"
                    style={{ backgroundColor: format.color }}
                  />
                  <span className="font-medium capitalize">{format.name}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant={format.is_active ? 'default' : 'outline'}
                    onClick={() => toggleActive(format)}
                  >
                    {format.is_active ? 'Active' : 'Inactive'}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => handleDelete(format.id)}>
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
