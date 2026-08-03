import React, { useState, useMemo } from 'react';
import { Plus, Trash2, Edit, Save, X } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import { convexToTaxonomy, sortTaxonomyByName } from '@/integrations/convex/adapter';
import { toast } from 'sonner';

interface Platform {
  id: Id<'platforms'>;
  name: string;
  icon_name: string;
  color: string;
  is_active: boolean;
}

const availableIcons = [
  'Facebook', 'Instagram', 'Twitter', 'Linkedin', 'Youtube', 'Twitch',
  'MessageCircle', 'Share2', 'Users', 'Globe', 'Smartphone', 'Monitor'
];

export const PlatformManager: React.FC = () => {
  const raw = useQuery(api.taxonomy.listPlatforms);
  const loading = raw === undefined;
  const platforms = useMemo<Platform[]>(
    () => sortTaxonomyByName((raw ?? []).map((d) => convexToTaxonomy<Platform>(d))),
    [raw],
  );
  const createPlatform = useMutation(api.taxonomy.createPlatform);
  const updatePlatform = useMutation(api.taxonomy.updatePlatform);
  const removePlatform = useMutation(api.taxonomy.removePlatform);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newPlatform, setNewPlatform] = useState({
    name: '',
    icon_name: 'Share2',
    color: '#1877F2',
  });

  const handleCreate = async () => {
    if (!newPlatform.name.trim()) {
      toast.error('Platform name is required');
      return;
    }
    try {
      await createPlatform({
        name: newPlatform.name.toLowerCase(),
        iconName: newPlatform.icon_name,
        color: newPlatform.color,
      });
      toast.success('Platform created successfully!');
      setIsCreating(false);
      setNewPlatform({ name: '', icon_name: 'Share2', color: '#1877F2' });
      window.dispatchEvent(new CustomEvent('settingsChanged'));
    } catch (error) {
      console.error('Error creating platform:', error);
      toast.error('Failed to create platform');
    }
  };

  const handleUpdate = async (id: Id<'platforms'>, patch: Partial<Platform>) => {
    try {
      await updatePlatform({
        id,
        patch: {
          name: patch.name,
          color: patch.color,
          iconName: patch.icon_name,
          isActive: patch.is_active,
        },
      });
      toast.success('Platform updated successfully!');
      setEditingId(null);
      window.dispatchEvent(new CustomEvent('settingsChanged'));
    } catch (error) {
      console.error('Error updating platform:', error);
      toast.error('Failed to update platform');
    }
  };

  const handleDelete = async (id: Id<'platforms'>) => {
    if (!confirm('Are you sure you want to delete this platform?')) return;
    try {
      await removePlatform({ id });
      toast.success('Platform deleted successfully!');
      window.dispatchEvent(new CustomEvent('settingsChanged'));
    } catch (error) {
      console.error('Error deleting platform:', error);
      toast.error('Failed to delete platform');
    }
  };

  const toggleActive = async (platform: Platform) => {
    await handleUpdate(platform.id, { is_active: !platform.is_active });
  };

  if (loading) {
    return <div className="text-center py-4">Loading platforms...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Manage Platforms</h3>
        <Button size="sm" onClick={() => setIsCreating(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Add
        </Button>
      </div>

      {isCreating && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">New Platform</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={newPlatform.name}
                onChange={(e) => setNewPlatform({ ...newPlatform, name: e.target.value })}
                placeholder="e.g., tiktok"
              />
            </div>
            <div>
              <Label htmlFor="icon">Icon</Label>
              <Select
                value={newPlatform.icon_name}
                onValueChange={(value) => setNewPlatform({ ...newPlatform, icon_name: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableIcons.map((icon) => {
                    const IconComponent = LucideIcons[icon as keyof typeof LucideIcons] as any;
                    return (
                      <SelectItem key={icon} value={icon}>
                        <div className="flex items-center gap-2">
                          {IconComponent && <IconComponent className="h-4 w-4" />}
                          {icon}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="color">Color</Label>
              <Input
                id="color"
                type="color"
                value={newPlatform.color}
                onChange={(e) => setNewPlatform({ ...newPlatform, color: e.target.value })}
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
                  setNewPlatform({ name: '', icon_name: 'Share2', color: '#1877F2' });
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
        {platforms.map((platform) => {
          const IconComponent = LucideIcons[platform.icon_name as keyof typeof LucideIcons] as any;
          const isEditing = editingId === platform.id;

          return (
            <Card key={platform.id} className={!platform.is_active ? 'opacity-50' : ''}>
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {IconComponent && (
                      <IconComponent 
                        className="h-4 w-4" 
                        style={{ color: platform.color }}
                      />
                    )}
                    <span className="font-medium capitalize">{platform.name}</span>
                    <div 
                      className="w-3 h-3 rounded-full border"
                      style={{ backgroundColor: platform.color }}
                    />
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant={platform.is_active ? "default" : "outline"}
                      onClick={() => toggleActive(platform)}
                    >
                      {platform.is_active ? 'Active' : 'Inactive'}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setEditingId(isEditing ? null : platform.id)}
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(platform.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};