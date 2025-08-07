import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Status {
  id: string;
  name: string;
  color: string;
  is_active: boolean;
}

export const StatusManager: React.FC = () => {
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newStatus, setNewStatus] = useState({
    name: '',
    color: '#6B7280'
  });

  const fetchStatuses = async () => {
    try {
      const { data, error } = await supabase
        .from('post_statuses')
        .select('*')
        .order('name');
      
      if (error) throw error;
      setStatuses(data || []);
    } catch (error) {
      console.error('Error fetching statuses:', error);
      toast.error('Failed to load statuses');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatuses();
  }, []);

  const handleCreate = async () => {
    if (!newStatus.name.trim()) {
      toast.error('Status name is required');
      return;
    }

    try {
      const { error } = await supabase
        .from('post_statuses')
        .insert([{
          name: newStatus.name.toLowerCase(),
          color: newStatus.color
        }]);

      if (error) throw error;

      toast.success('Status created successfully!');
      setIsCreating(false);
      setNewStatus({ name: '', color: '#6B7280' });
      fetchStatuses();
      
      // Trigger refresh in other components
      window.dispatchEvent(new CustomEvent('settingsChanged'));
    } catch (error) {
      console.error('Error creating status:', error);
      toast.error('Failed to create status');
    }
  };

  const handleUpdate = async (id: string, updates: Partial<Status>) => {
    try {
      const { error } = await supabase
        .from('post_statuses')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      toast.success('Status updated successfully!');
      setEditingId(null);
      fetchStatuses();
      
      // Trigger refresh in other components
      window.dispatchEvent(new CustomEvent('settingsChanged'));
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this status?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('post_statuses')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Status deleted successfully!');
      fetchStatuses();
      
      // Trigger refresh in other components
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