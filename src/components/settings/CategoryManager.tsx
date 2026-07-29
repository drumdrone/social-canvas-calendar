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

interface Category {
  id: Id<'categories'>;
  name: string;
  color: string;
  format: string;
  is_active: boolean;
}

export const CategoryManager: React.FC = () => {
  const raw = useQuery(api.taxonomy.listCategories);
  const loading = raw === undefined;
  const categories = useMemo<Category[]>(
    () => sortTaxonomyByName((raw ?? []).map((d) => convexToTaxonomy<Category>(d))),
    [raw],
  );
  const createCategory = useMutation(api.taxonomy.createCategory);
  const updateCategory = useMutation(api.taxonomy.updateCategory);
  const removeCategory = useMutation(api.taxonomy.removeCategory);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newCategory, setNewCategory] = useState({
    name: '',
    color: '#3B82F6',
    format: 'text',
  });

  const handleCreate = async () => {
    if (!newCategory.name.trim()) {
      toast.error('Category name is required');
      return;
    }
    try {
      await createCategory({
        name: newCategory.name.toLowerCase(),
        color: newCategory.color,
        format: newCategory.format,
      });
      toast.success('Category created successfully!');
      setIsCreating(false);
      setNewCategory({ name: '', color: '#3B82F6', format: 'text' });
      window.dispatchEvent(new CustomEvent('settingsChanged'));
    } catch (error) {
      console.error('Error creating category:', error);
      toast.error('Failed to create category');
    }
  };

  const handleUpdate = async (id: Id<'categories'>, patch: Partial<Category>) => {
    try {
      await updateCategory({
        id,
        patch: {
          name: patch.name,
          color: patch.color,
          format: patch.format,
          isActive: patch.is_active,
        },
      });
      toast.success('Category updated successfully!');
      setEditingId(null);
      window.dispatchEvent(new CustomEvent('settingsChanged'));
    } catch (error) {
      console.error('Error updating category:', error);
      toast.error('Failed to update category');
    }
  };

  const handleDelete = async (id: Id<'categories'>) => {
    if (!confirm('Are you sure you want to delete this category?')) return;
    try {
      await removeCategory({ id });
      toast.success('Category deleted successfully!');
      window.dispatchEvent(new CustomEvent('settingsChanged'));
    } catch (error) {
      console.error('Error deleting category:', error);
      toast.error('Failed to delete category');
    }
  };

  const toggleActive = async (category: Category) => {
    await handleUpdate(category.id, { is_active: !category.is_active });
  };

  if (loading) {
    return <div className="text-center py-4">Loading categories...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Manage Categories</h3>
        <Button size="sm" onClick={() => setIsCreating(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Add
        </Button>
      </div>

      {isCreating && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">New Category</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={newCategory.name}
                onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                placeholder="e.g., story"
              />
            </div>
            <div>
              <Label htmlFor="color">Color</Label>
              <Input
                id="color"
                type="color"
                value={newCategory.color}
                onChange={(e) => setNewCategory({ ...newCategory, color: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="format">Format</Label>
              <Input
                id="format"
                value={newCategory.format}
                onChange={(e) => setNewCategory({ ...newCategory, format: e.target.value })}
                placeholder="e.g., text, image, video"
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
                  setNewCategory({ name: '', color: '#3B82F6', format: 'text' });
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
        {categories.map((category) => (
          <Card key={category.id} className={!category.is_active ? 'opacity-50' : ''}>
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full border"
                    style={{ backgroundColor: category.color }}
                  />
                  <div>
                    <span className="font-medium capitalize">{category.name}</span>
                    <p className="text-xs text-muted-foreground">{category.format}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant={category.is_active ? "default" : "outline"}
                    onClick={() => toggleActive(category)}
                  >
                    {category.is_active ? 'Active' : 'Inactive'}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDelete(category.id)}
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