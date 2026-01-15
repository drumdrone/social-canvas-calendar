import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Format {
  id: string;
  name: string;
  color: string;
  is_active: boolean;
}

export const FormatManager: React.FC = () => {
  const [formats, setFormats] = useState<Format[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newFormat, setNewFormat] = useState({
    name: '',
    color: '#3B82F6'
  });

  const fetchFormats = async () => {
    try {
      const { data, error } = await supabase
        .from('formats')
        .select('*')
        .order('name');
      
      if (error) throw error;
      setFormats(data || []);
    } catch (error) {
      console.error('Error fetching formats:', error);
      toast.error('Failed to load formats');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFormats();
  }, []);

  const handleCreate = async () => {
    if (!newFormat.name.trim()) {
      toast.error('Format name is required');
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('formats')
        .insert([{
          user_id: user.id,
          name: newFormat.name.toLowerCase(),
          color: newFormat.color
        }]);

      if (error) throw error;

      toast.success('Format created successfully!');
      setIsCreating(false);
      setNewFormat({ name: '', color: '#3B82F6' });
      fetchFormats();

      window.dispatchEvent(new CustomEvent('settingsChanged'));
    } catch (error) {
      console.error('Error creating format:', error);
      toast.error('Failed to create format');
    }
  };

  const handleUpdate = async (id: string, updates: Partial<Format>) => {
    try {
      const { error } = await supabase
        .from('formats')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      toast.success('Format updated successfully!');
      setEditingId(null);
      fetchFormats();
      
      // Trigger refresh in other components
      window.dispatchEvent(new CustomEvent('settingsChanged'));
    } catch (error) {
      console.error('Error updating format:', error);
      toast.error('Failed to update format');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this format?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('formats')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Format deleted successfully!');
      fetchFormats();
      
      // Trigger refresh in other components
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
                placeholder="e.g., video"
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
                    variant={format.is_active ? "default" : "outline"}
                    onClick={() => toggleActive(format)}
                  >
                    {format.is_active ? 'Active' : 'Inactive'}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDelete(format.id)}
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