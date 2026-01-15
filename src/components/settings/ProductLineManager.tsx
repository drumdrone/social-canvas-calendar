import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ProductLine {
  id: string;
  name: string;
  color: string;
  is_active: boolean;
}

export const ProductLineManager: React.FC = () => {
  const [productLines, setProductLines] = useState<ProductLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newProductLine, setNewProductLine] = useState({
    name: '',
    color: '#3B82F6'
  });

  const fetchProductLines = async () => {
    try {
      const { data, error } = await supabase
        .from('product_lines')
        .select('*')
        .order('name');
      
      if (error) throw error;
      setProductLines(data || []);
    } catch (error) {
      console.error('Error fetching product lines:', error);
      toast.error('Failed to load product lines');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProductLines();
  }, []);

  const handleCreate = async () => {
    if (!newProductLine.name.trim()) {
      toast.error('Product line name is required');
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('product_lines')
        .insert([{
          user_id: user.id,
          name: newProductLine.name.trim(),
          color: newProductLine.color
        }]);

      if (error) throw error;

      toast.success('Product line created successfully!');
      setIsCreating(false);
      setNewProductLine({ name: '', color: '#3B82F6' });
      fetchProductLines();

      window.dispatchEvent(new CustomEvent('settingsChanged'));
    } catch (error) {
      console.error('Error creating product line:', error);
      toast.error('Failed to create product line');
    }
  };

  const handleUpdate = async (id: string, updates: Partial<ProductLine>) => {
    try {
      const { error } = await supabase
        .from('product_lines')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      toast.success('Product line updated successfully!');
      setEditingId(null);
      fetchProductLines();
      
      // Trigger refresh in other components
      window.dispatchEvent(new CustomEvent('settingsChanged'));
    } catch (error) {
      console.error('Error updating product line:', error);
      toast.error('Failed to update product line');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this product line?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('product_lines')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Product line deleted successfully!');
      fetchProductLines();
      
      // Trigger refresh in other components
      window.dispatchEvent(new CustomEvent('settingsChanged'));
    } catch (error) {
      console.error('Error deleting product line:', error);
      toast.error('Failed to delete product line');
    }
  };

  const toggleActive = async (productLine: ProductLine) => {
    await handleUpdate(productLine.id, { is_active: !productLine.is_active });
  };

  if (loading) {
    return <div className="text-center py-4">Loading product lines...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Manage Product Lines</h3>
        <Button size="sm" onClick={() => setIsCreating(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Add
        </Button>
      </div>

      {isCreating && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">New Product Line</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={newProductLine.name}
                onChange={(e) => setNewProductLine({ ...newProductLine, name: e.target.value })}
                placeholder="e.g., Premium Collection"
              />
            </div>
            <div>
              <Label htmlFor="color">Color</Label>
              <Input
                id="color"
                type="color"
                value={newProductLine.color}
                onChange={(e) => setNewProductLine({ ...newProductLine, color: e.target.value })}
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
                  setNewProductLine({ name: '', color: '#3B82F6' });
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
        {productLines.map((productLine) => (
          <Card key={productLine.id} className={!productLine.is_active ? 'opacity-50' : ''}>
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full border"
                    style={{ backgroundColor: productLine.color }}
                  />
                  <span className="font-medium">{productLine.name}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant={productLine.is_active ? "default" : "outline"}
                    onClick={() => toggleActive(productLine)}
                  >
                    {productLine.is_active ? 'Active' : 'Inactive'}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDelete(productLine.id)}
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