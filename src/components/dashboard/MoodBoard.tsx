import React, { useState, useEffect, useRef } from 'react';
import { Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

interface MoodBoardItem {
  id: string;
  napad: string;
  text: string;
  popis: string;
  image_prompt: string;
  format: string;
}

export const MoodBoard: React.FC = () => {
  const [items, setItems] = useState<MoodBoardItem[]>([]);
  const [editingCell, setEditingCell] = useState<{ rowId: string; column: keyof MoodBoardItem } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);

  const columns: Array<{ key: keyof MoodBoardItem; label: string }> = [
    { key: 'napad', label: 'Nápad' },
    { key: 'text', label: 'Text' },
    { key: 'popis', label: 'Popis' },
    { key: 'image_prompt', label: 'Image prompt' },
    { key: 'format', label: 'Formát' }
  ];

  useEffect(() => {
    loadMoodBoardData();
  }, []);

  useEffect(() => {
    if (editingCell && inputRef.current) {
      inputRef.current.focus();
    }
  }, [editingCell]);

  const loadMoodBoardData = async () => {
    try {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('mood_board_items')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setItems(data || []);
    } catch (error) {
      console.error('Error loading mood board data:', error);
      toast({
        title: "Error",
        description: "Failed to load mood board data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const saveItem = async (item: MoodBoardItem) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('mood_board_items')
        .upsert({
          id: item.id,
          user_id: user.id,
          napad: item.napad,
          text: item.text,
          popis: item.popis,
          image_prompt: item.image_prompt,
          format: item.format
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error saving item:', error);
      toast({
        title: "Error",
        description: "Failed to save item",
        variant: "destructive",
      });
    }
  };

  const addNewItem = async () => {
    const newItem: MoodBoardItem = {
      id: crypto.randomUUID(),
      napad: '',
      text: '',
      popis: '',
      image_prompt: '',
      format: ''
    };
    
    setItems([...items, newItem]);
    await saveItem(newItem);
    
    // Start editing the first cell of the new row
    setEditingCell({ rowId: newItem.id, column: 'napad' });
  };

  const deleteItem = async (id: string) => {
    setItems(items.filter(item => item.id !== id));
    try {
      const { error } = await supabase
        .from('mood_board_items')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting item:', error);
      toast({
        title: "Error",
        description: "Failed to delete item",
        variant: "destructive",
      });
    }
  };

  const updateItem = (id: string, column: keyof MoodBoardItem, value: string) => {
    const updatedItems = items.map(item =>
      item.id === id ? { ...item, [column]: value } : item
    );
    setItems(updatedItems);
  };

  const handleCellClick = (rowId: string, column: keyof MoodBoardItem) => {
    if (column === 'id') return; // Don't edit ID column
    setEditingCell({ rowId, column });
  };

  const handleKeyDown = async (e: React.KeyboardEvent, rowId: string, column: keyof MoodBoardItem) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      
      // Save current item
      const item = items.find(i => i.id === rowId);
      if (item) {
        await saveItem(item);
      }

      // Move to next cell
      const currentColumnIndex = columns.findIndex(col => col.key === column);
      const currentRowIndex = items.findIndex(item => item.id === rowId);
      
      if (currentColumnIndex < columns.length - 1) {
        // Move to next column in same row
        setEditingCell({ rowId, column: columns[currentColumnIndex + 1].key });
      } else if (currentRowIndex < items.length - 1) {
        // Move to first column of next row
        const nextRowId = items[currentRowIndex + 1].id;
        setEditingCell({ rowId: nextRowId, column: columns[0].key });
      } else {
        // End of table, stop editing
        setEditingCell(null);
      }
    } else if (e.key === 'Escape') {
      setEditingCell(null);
    }
  };

  const handleBlur = async (rowId: string) => {
    const item = items.find(i => i.id === rowId);
    if (item) {
      await saveItem(item);
    }
    setEditingCell(null);
  };

  if (isLoading) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <div className="text-muted-foreground">Loading mood board...</div>
      </div>
    );
  }

  return (
    <div className="h-full w-full p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Mood Board</h2>
        <Button onClick={addNewItem} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Add Item
        </Button>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((col) => (
                <TableHead key={col.key} className="w-1/5">
                  {col.label}
                </TableHead>
              ))}
              <TableHead className="w-20">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id}>
                {columns.map((col) => (
                  <TableCell
                    key={col.key}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleCellClick(item.id, col.key)}
                  >
                    {editingCell?.rowId === item.id && editingCell?.column === col.key ? (
                      <Input
                        ref={inputRef}
                        value={item[col.key]}
                        onChange={(e) => updateItem(item.id, col.key, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, item.id, col.key)}
                        onBlur={() => handleBlur(item.id)}
                        className="border-none p-0 h-auto bg-transparent focus:ring-0 focus:ring-offset-0"
                      />
                    ) : (
                      <span className="block p-1">
                        {item[col.key] || <span className="text-muted-foreground">Click to edit...</span>}
                      </span>
                    )}
                  </TableCell>
                ))}
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteItem(item.id)}
                    className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {items.length === 0 && (
              <TableRow>
                <TableCell colSpan={columns.length + 1} className="text-center text-muted-foreground">
                  No items yet. Click "Add Item" to get started.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};