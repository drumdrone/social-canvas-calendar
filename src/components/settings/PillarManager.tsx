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

interface Pillar {
  id: Id<'pillars'>;
  name: string;
  color: string;
  is_active: boolean;
}

export const PillarManager: React.FC = () => {
  const raw = useQuery(api.taxonomy.listPillars);
  const loading = raw === undefined;
  const pillars = useMemo<Pillar[]>(
    () => sortTaxonomyByName((raw ?? []).map((d) => convexToTaxonomy<Pillar>(d))),
    [raw],
  );
  const createPillar = useMutation(api.taxonomy.createPillar);
  const updatePillar = useMutation(api.taxonomy.updatePillar);
  const removePillar = useMutation(api.taxonomy.removePillar);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newPillar, setNewPillar] = useState({ name: '', color: '#3B82F6' });

  const handleCreate = async () => {
    if (!newPillar.name.trim()) {
      toast.error('Pillar name is required');
      return;
    }
    try {
      await createPillar({ name: newPillar.name.trim(), color: newPillar.color });
      toast.success('Pillar created successfully!');
      setIsCreating(false);
      setNewPillar({ name: '', color: '#3B82F6' });
      window.dispatchEvent(new CustomEvent('settingsChanged'));
    } catch (error) {
      console.error('Error creating pillar:', error);
      toast.error('Failed to create pillar');
    }
  };

  const handleUpdate = async (id: Id<'pillars'>, patch: Partial<Pillar>) => {
    try {
      await updatePillar({
        id,
        patch: { name: patch.name, color: patch.color, isActive: patch.is_active },
      });
      toast.success('Pillar updated successfully!');
      setEditingId(null);
      window.dispatchEvent(new CustomEvent('settingsChanged'));
    } catch (error) {
      console.error('Error updating pillar:', error);
      toast.error('Failed to update pillar');
    }
  };

  const handleDelete = async (id: Id<'pillars'>) => {
    if (!confirm('Are you sure you want to delete this pillar?')) return;
    try {
      await removePillar({ id });
      toast.success('Pillar deleted successfully!');
      window.dispatchEvent(new CustomEvent('settingsChanged'));
    } catch (error) {
      console.error('Error deleting pillar:', error);
      toast.error('Failed to delete pillar');
    }
  };

  const toggleActive = async (pillar: Pillar) => {
    await handleUpdate(pillar.id, { is_active: !pillar.is_active });
  };

  if (loading) {
    return <div className="text-center py-4">Loading pillars...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Manage Pillars</h3>
        <Button size="sm" onClick={() => setIsCreating(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Add
        </Button>
      </div>

      {isCreating && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">New Pillar</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={newPillar.name}
                onChange={(e) => setNewPillar({ ...newPillar, name: e.target.value })}
                placeholder="e.g., Sustainability"
              />
            </div>
            <div>
              <Label htmlFor="color">Color</Label>
              <Input
                id="color"
                type="color"
                value={newPillar.color}
                onChange={(e) => setNewPillar({ ...newPillar, color: e.target.value })}
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
                  setNewPillar({ name: '', color: '#3B82F6' });
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
        {pillars.map((pillar) => (
          <Card key={pillar.id} className={!pillar.is_active ? 'opacity-50' : ''}>
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full border"
                    style={{ backgroundColor: pillar.color }}
                  />
                  <span className="font-medium">{pillar.name}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant={pillar.is_active ? "default" : "outline"}
                    onClick={() => toggleActive(pillar)}
                  >
                    {pillar.is_active ? 'Active' : 'Inactive'}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDelete(pillar.id)}
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