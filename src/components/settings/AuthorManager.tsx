import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';

interface Author {
  id: string;
  name: string;
  initials: string;
  color: string;
  email?: string;
  is_active: boolean;
}

export const AuthorManager: React.FC = () => {
  const [authors, setAuthors] = useState<Author[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newAuthor, setNewAuthor] = useState({
    name: '',
    initials: '',
    email: '',
    color: '#3B82F6'
  });
  const [editingAuthor, setEditingAuthor] = useState({
    name: '',
    initials: '',
    email: '',
    color: '#3B82F6'
  });

  const fetchAuthors = async () => {
    try {
      const { data, error } = await supabase
        .from('authors')
        .select('id, name, initials, color, email, is_active')
        .order('name');
      
      if (error) throw error;
      setAuthors(data || []);
    } catch (error) {
      console.error('Error fetching authors:', error);
      toast.error('Failed to load authors');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuthors();
  }, []);

  const handleCreate = async () => {
    if (!newAuthor.name.trim() || !newAuthor.initials.trim()) {
      toast.error('Name and initials are required');
      return;
    }

    if (newAuthor.initials.length !== 3) {
      toast.error('Initials must be exactly 3 characters');
      return;
    }

    try {
      const { error } = await supabase
        .from('authors')
        .insert([{
          name: newAuthor.name,
          initials: newAuthor.initials.toUpperCase(),
          email: newAuthor.email || null,
          color: newAuthor.color
        }]);

      if (error) throw error;

      toast.success('Author created successfully!');
      setIsCreating(false);
      setNewAuthor({ name: '', initials: '', email: '', color: '#3B82F6' });
      fetchAuthors();
      
      // Trigger refresh in other components
      window.dispatchEvent(new CustomEvent('settingsChanged'));
    } catch (error) {
      console.error('Error creating author:', error);
      toast.error('Failed to create author');
    }
  };

  const handleUpdate = async (id: string, updates: Partial<Author>) => {
    try {
      const { error } = await supabase
        .from('authors')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      toast.success('Author updated successfully!');
      setEditingId(null);
      fetchAuthors();
      
      // Trigger refresh in other components
      window.dispatchEvent(new CustomEvent('settingsChanged'));
    } catch (error) {
      console.error('Error updating author:', error);
      toast.error('Failed to update author');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this author?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('authors')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Author deleted successfully!');
      fetchAuthors();
      
      // Trigger refresh in other components
      window.dispatchEvent(new CustomEvent('settingsChanged'));
    } catch (error) {
      console.error('Error deleting author:', error);
      toast.error('Failed to delete author');
    }
  };

  const toggleActive = async (author: Author) => {
    await handleUpdate(author.id, { is_active: !author.is_active });
  };

  const startEditing = (author: Author) => {
    setEditingId(author.id);
    setEditingAuthor({
      name: author.name,
      initials: author.initials,
      email: author.email || '',
      color: author.color
    });
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditingAuthor({ name: '', initials: '', email: '', color: '#3B82F6' });
  };

  const saveEdit = async () => {
    if (!editingAuthor.name.trim() || !editingAuthor.initials.trim()) {
      toast.error('Name and initials are required');
      return;
    }

    if (editingAuthor.initials.length !== 3) {
      toast.error('Initials must be exactly 3 characters');
      return;
    }

    if (editingId) {
      await handleUpdate(editingId, {
        name: editingAuthor.name,
        initials: editingAuthor.initials.toUpperCase(),
        email: editingAuthor.email || null,
        color: editingAuthor.color
      });
    }
  };

  if (loading) {
    return <div className="text-center py-4">Loading authors...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Manage Authors</h3>
        <Button size="sm" onClick={() => setIsCreating(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Add
        </Button>
      </div>

      {isCreating && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">New Author</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={newAuthor.name}
                onChange={(e) => setNewAuthor({ ...newAuthor, name: e.target.value })}
                placeholder="e.g., John Doe"
              />
            </div>
            <div>
              <Label htmlFor="initials">Initials (3 letters)</Label>
              <Input
                id="initials"
                value={newAuthor.initials}
                onChange={(e) => setNewAuthor({ ...newAuthor, initials: e.target.value.slice(0, 3) })}
                placeholder="e.g., JDO"
                maxLength={3}
              />
            </div>
            <div>
              <Label htmlFor="email">Email (optional)</Label>
              <Input
                id="email"
                type="email"
                value={newAuthor.email}
                onChange={(e) => setNewAuthor({ ...newAuthor, email: e.target.value })}
                placeholder="e.g., john@example.com"
              />
            </div>
            <div>
              <Label htmlFor="color">Color</Label>
              <Input
                id="color"
                type="color"
                value={newAuthor.color}
                onChange={(e) => setNewAuthor({ ...newAuthor, color: e.target.value })}
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
                  setNewAuthor({ name: '', initials: '', email: '', color: '#3B82F6' });
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
        {authors.map((author) => (
          <Card key={author.id} className={!author.is_active ? 'opacity-50' : ''}>
            <CardContent className="p-3">
              {editingId === author.id ? (
                // Edit mode
                <div className="space-y-3">
                  <div>
                    <Label htmlFor={`edit-name-${author.id}`}>Name</Label>
                    <Input
                      id={`edit-name-${author.id}`}
                      value={editingAuthor.name}
                      onChange={(e) => setEditingAuthor({ ...editingAuthor, name: e.target.value })}
                      placeholder="e.g., John Doe"
                    />
                  </div>
                  <div>
                    <Label htmlFor={`edit-initials-${author.id}`}>Initials (3 letters)</Label>
                    <Input
                      id={`edit-initials-${author.id}`}
                      value={editingAuthor.initials}
                      onChange={(e) => setEditingAuthor({ ...editingAuthor, initials: e.target.value.slice(0, 3) })}
                      placeholder="e.g., JDO"
                      maxLength={3}
                    />
                  </div>
                  <div>
                    <Label htmlFor={`edit-email-${author.id}`}>Email (optional)</Label>
                    <Input
                      id={`edit-email-${author.id}`}
                      type="email"
                      value={editingAuthor.email}
                      onChange={(e) => setEditingAuthor({ ...editingAuthor, email: e.target.value })}
                      placeholder="e.g., john@example.com"
                    />
                  </div>
                  <div>
                    <Label htmlFor={`edit-color-${author.id}`}>Color</Label>
                    <Input
                      id={`edit-color-${author.id}`}
                      type="color"
                      value={editingAuthor.color}
                      onChange={(e) => setEditingAuthor({ ...editingAuthor, color: e.target.value })}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={saveEdit}>
                      <Save className="h-3 w-3 mr-1" />
                      Save
                    </Button>
                    <Button size="sm" variant="outline" onClick={cancelEditing}>
                      <X className="h-3 w-3 mr-1" />
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                // Display mode
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Badge 
                      className="text-white font-bold text-xs rounded-full w-8 h-8 flex items-center justify-center"
                      style={{ backgroundColor: author.color }}
                    >
                      {author.initials}
                    </Badge>
                    <div>
                      <span className="font-medium">{author.name}</span>
                      <p className="text-xs text-muted-foreground">{author.initials}</p>
                      {author.email && <p className="text-xs text-muted-foreground">{author.email}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant={author.is_active ? "default" : "outline"}
                      onClick={() => toggleActive(author)}
                    >
                      {author.is_active ? 'Active' : 'Inactive'}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => startEditing(author)}
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(author.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};