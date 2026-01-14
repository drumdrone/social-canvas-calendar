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

      const { data, error } = await supabase
        .from('mood_board_items')
        .select('*')
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
      const { error } = await supabase
        .from('mood_board_items')
        .upsert({
          id: item.id,
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
    <div className="h-full w-full p-4 lg:p-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-3">
        <h2 className="text-xl lg:text-2xl font-bold">Mood Board</h2>
        <Button onClick={addNewItem} size="sm" className="w-full sm:w-auto">
          <Plus className="h-4 w-4 mr-2" />
          Add Item
        </Button>
      </div>

      <div className="border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[120px]">Nápad</TableHead>
              <TableHead className="min-w-[150px] hidden sm:table-cell">Text</TableHead>
              <TableHead className="min-w-[150px] hidden md:table-cell">Popis</TableHead>
              <TableHead className="min-w-[150px] hidden lg:table-cell">Image prompt</TableHead>
              <TableHead className="min-w-[100px]">Formát</TableHead>
              <TableHead className="w-16">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id}>
                <TableCell 
                  className="cursor-pointer hover:bg-muted/50 font-medium"
                  onClick={() => handleCellClick(item.id, 'napad')}
                >
                  {editingCell?.rowId === item.id && editingCell?.column === 'napad' ? (
                    <Input
                      ref={inputRef}
                      value={item.napad}
                      onChange={(e) => updateItem(item.id, 'napad', e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, item.id, 'napad')}
                      onBlur={() => handleBlur(item.id)}
                      className="border-none p-0 h-auto bg-transparent focus:ring-0 focus:ring-offset-0"
                    />
                  ) : (
                    <span className="block p-1">
                      {item.napad || <span className="text-muted-foreground">Click to edit...</span>}
                    </span>
                  )}
                </TableCell>
                <TableCell 
                  className="cursor-pointer hover:bg-muted/50 hidden sm:table-cell"
                  onClick={() => handleCellClick(item.id, 'text')}
                >
                  {editingCell?.rowId === item.id && editingCell?.column === 'text' ? (
                    <Input
                      ref={inputRef}
                      value={item.text}
                      onChange={(e) => updateItem(item.id, 'text', e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, item.id, 'text')}
                      onBlur={() => handleBlur(item.id)}
                      className="border-none p-0 h-auto bg-transparent focus:ring-0 focus:ring-offset-0"
                    />
                  ) : (
                    <span className="block p-1">
                      {item.text || <span className="text-muted-foreground">Click to edit...</span>}
                    </span>
                  )}
                </TableCell>
                <TableCell 
                  className="cursor-pointer hover:bg-muted/50 hidden md:table-cell"
                  onClick={() => handleCellClick(item.id, 'popis')}
                >
                  {editingCell?.rowId === item.id && editingCell?.column === 'popis' ? (
                    <Input
                      ref={inputRef}
                      value={item.popis}
                      onChange={(e) => updateItem(item.id, 'popis', e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, item.id, 'popis')}
                      onBlur={() => handleBlur(item.id)}
                      className="border-none p-0 h-auto bg-transparent focus:ring-0 focus:ring-offset-0"
                    />
                  ) : (
                    <span className="block p-1">
                      {item.popis || <span className="text-muted-foreground">Click to edit...</span>}
                    </span>
                  )}
                </TableCell>
                <TableCell 
                  className="cursor-pointer hover:bg-muted/50 hidden lg:table-cell"
                  onClick={() => handleCellClick(item.id, 'image_prompt')}
                >
                  {editingCell?.rowId === item.id && editingCell?.column === 'image_prompt' ? (
                    <Input
                      ref={inputRef}
                      value={item.image_prompt}
                      onChange={(e) => updateItem(item.id, 'image_prompt', e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, item.id, 'image_prompt')}
                      onBlur={() => handleBlur(item.id)}
                      className="border-none p-0 h-auto bg-transparent focus:ring-0 focus:ring-offset-0"
                    />
                  ) : (
                    <span className="block p-1">
                      {item.image_prompt || <span className="text-muted-foreground">Click to edit...</span>}
                    </span>
                  )}
                </TableCell>
                <TableCell 
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleCellClick(item.id, 'format')}
                >
                  {editingCell?.rowId === item.id && editingCell?.column === 'format' ? (
                    <Input
                      ref={inputRef}
                      value={item.format}
                      onChange={(e) => updateItem(item.id, 'format', e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, item.id, 'format')}
                      onBlur={() => handleBlur(item.id)}
                      className="border-none p-0 h-auto bg-transparent focus:ring-0 focus:ring-offset-0"
                    />
                  ) : (
                    <span className="block p-1">
                      {item.format || <span className="text-muted-foreground">Click to edit...</span>}
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteItem(item.id)}
                    className="h-6 w-6 lg:h-8 lg:w-8 p-0 text-destructive hover:text-destructive"
                  >
                    <X className="h-3 w-3 lg:h-4 lg:w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {items.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
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