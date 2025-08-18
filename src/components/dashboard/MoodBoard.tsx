import React, { useState, useEffect } from 'react';
import { Plus, Upload, X, Palette } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

interface StickyNote {
  id: string;
  content: string;
  color: string;
  position: { x: number; y: number };
}

interface ImageNote {
  id: string;
  url: string;
  position: { x: number; y: number };
  width: number;
  height: number;
}

export const MoodBoard: React.FC = () => {
  const [stickyNotes, setStickyNotes] = useState<StickyNote[]>([]);
  const [images, setImages] = useState<ImageNote[]>([]);
  const [selectedNote, setSelectedNote] = useState<string | null>(null);
  const [newNoteContent, setNewNoteContent] = useState('');
  const [draggedItem, setDraggedItem] = useState<{ type: 'note' | 'image'; id: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const colors = [
    'bg-yellow-200', 'bg-pink-200', 'bg-blue-200', 'bg-green-200',
    'bg-purple-200', 'bg-orange-200', 'bg-red-200', 'bg-cyan-200'
  ];

  // Load data from Supabase on mount
  useEffect(() => {
    loadMoodBoardData();
  }, []);

  const loadMoodBoardData = async () => {
    try {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Load sticky notes
      const { data: notesData, error: notesError } = await supabase
        .from('mood_board_notes')
        .select('*')
        .eq('user_id', user.id);

      if (notesError) throw notesError;

      // Load images
      const { data: imagesData, error: imagesError } = await supabase
        .from('mood_board_images')
        .select('*')
        .eq('user_id', user.id);

      if (imagesError) throw imagesError;

      // Convert database format to component format
      const notes = notesData.map(note => ({
        id: note.id,
        content: note.content,
        color: note.color,
        position: { x: Number(note.position_x), y: Number(note.position_y) }
      }));

      const imgs = imagesData.map(img => ({
        id: img.id,
        url: img.url,
        position: { x: Number(img.position_x), y: Number(img.position_y) },
        width: Number(img.width),
        height: Number(img.height)
      }));

      setStickyNotes(notes);
      setImages(imgs);
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

  const saveStickyNote = async (note: StickyNote) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('mood_board_notes')
        .upsert({
          id: note.id,
          user_id: user.id,
          content: note.content,
          color: note.color,
          position_x: note.position.x,
          position_y: note.position.y
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error saving sticky note:', error);
      toast({
        title: "Error",
        description: "Failed to save note",
        variant: "destructive",
      });
    }
  };

  const saveImage = async (image: ImageNote) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('mood_board_images')
        .upsert({
          id: image.id,
          user_id: user.id,
          url: image.url,
          position_x: image.position.x,
          position_y: image.position.y,
          width: image.width,
          height: image.height
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error saving image:', error);
      toast({
        title: "Error",
        description: "Failed to save image",
        variant: "destructive",
      });
    }
  };

  const addStickyNote = async () => {
    if (!newNoteContent.trim()) return;
    
    const newNote: StickyNote = {
      id: crypto.randomUUID(),
      content: newNoteContent,
      color: colors[Math.floor(Math.random() * colors.length)],
      position: { x: Math.random() * 400, y: Math.random() * 300 }
    };
    
    setStickyNotes([...stickyNotes, newNote]);
    setNewNoteContent('');
    await saveStickyNote(newNote);
  };

  const addImage = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      processImageFile(file);
    }
    event.target.value = '';
  };

  const processImageFile = async (file: File) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const newImage: ImageNote = {
        id: crypto.randomUUID(),
        url: e.target?.result as string,
        position: { x: Math.random() * 300, y: Math.random() * 200 },
        width: 200,
        height: 150
      };
      setImages([...images, newImage]);
      await saveImage(newImage);
    };
    reader.readAsDataURL(file);
  };

  const handlePaste = (event: React.ClipboardEvent) => {
    const items = event.clipboardData?.items;
    if (items) {
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.indexOf('image') !== -1) {
          const file = item.getAsFile();
          if (file) {
            processImageFile(file);
          }
          event.preventDefault();
          break;
        }
      }
    }
  };

  const deleteNote = async (id: string) => {
    setStickyNotes(stickyNotes.filter(note => note.id !== id));
    try {
      const { error } = await supabase
        .from('mood_board_notes')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting note:', error);
      toast({
        title: "Error",
        description: "Failed to delete note",
        variant: "destructive",
      });
    }
  };

  const deleteImage = async (id: string) => {
    setImages(images.filter(img => img.id !== id));
    try {
      const { error } = await supabase
        .from('mood_board_images')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting image:', error);
      toast({
        title: "Error",
        description: "Failed to delete image",
        variant: "destructive",
      });
    }
  };

  const updateNoteContent = async (id: string, content: string) => {
    const updatedNotes = stickyNotes.map(note => 
      note.id === id ? { ...note, content } : note
    );
    setStickyNotes(updatedNotes);
    
    const updatedNote = updatedNotes.find(note => note.id === id);
    if (updatedNote) {
      await saveStickyNote(updatedNote);
    }
  };

  const handleMouseDown = (type: 'note' | 'image', id: string) => {
    setDraggedItem({ type, id });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!draggedItem) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    if (draggedItem.type === 'note') {
      const updatedNotes = stickyNotes.map(note =>
        note.id === draggedItem.id ? { ...note, position: { x, y } } : note
      );
      setStickyNotes(updatedNotes);
    } else {
      const updatedImages = images.map(img =>
        img.id === draggedItem.id ? { ...img, position: { x, y } } : img
      );
      setImages(updatedImages);
    }
  };

  const handleMouseUp = async () => {
    if (draggedItem) {
      // Save position changes
      if (draggedItem.type === 'note') {
        const note = stickyNotes.find(n => n.id === draggedItem.id);
        if (note) await saveStickyNote(note);
      } else {
        const image = images.find(i => i.id === draggedItem.id);
        if (image) await saveImage(image);
      }
    }
    setDraggedItem(null);
  };

  if (isLoading) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <div className="text-muted-foreground">Loading mood board...</div>
      </div>
    );
  }

  return (
    <div className="h-full w-full">
      <div className="flex items-center gap-4 mb-6 p-4 bg-card border-b">
        <div className="flex gap-2 flex-1">
          <Input
            placeholder="Add a sticky note..."
            value={newNoteContent}
            onChange={(e) => setNewNoteContent(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && addStickyNote()}
            className="max-w-xs"
          />
          <Button onClick={addStickyNote} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Note
          </Button>
        </div>
        
        <input
          type="file"
          accept="image/*"
          onChange={addImage}
          className="hidden"
          id="image-upload"
        />
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => document.getElementById('image-upload')?.click()}
        >
          <Upload className="h-4 w-4 mr-2" />
          Add Image
        </Button>
      </div>

      <div 
        className="relative h-full bg-muted/20 overflow-hidden"
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onPaste={handlePaste}
        tabIndex={0}
      >
        {/* Sticky Notes */}
        {stickyNotes.map((note) => (
          <Card
            key={note.id}
            className={cn(
              "absolute w-48 p-3 shadow-lg cursor-move select-none",
              note.color,
              selectedNote === note.id && "ring-2 ring-primary"
            )}
            style={{
              left: note.position.x,
              top: note.position.y,
              transform: 'rotate(-2deg)'
            }}
            onMouseDown={(e) => {
              if (selectedNote !== note.id) {
                handleMouseDown('note', note.id);
              }
            }}
            onClick={() => setSelectedNote(selectedNote === note.id ? null : note.id)}
          >
            <div className="flex justify-between items-start mb-2">
              <Palette className="h-3 w-3 text-muted-foreground" />
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                onMouseDown={(e) => {
                  e.stopPropagation();
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  deleteNote(note.id);
                }}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
            {selectedNote === note.id ? (
              <Textarea
                value={note.content}
                onChange={(e) => updateNoteContent(note.id, e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    setSelectedNote(null);
                  }
                  if (e.key === 'Escape') {
                    setSelectedNote(null);
                  }
                }}
                className="min-h-[60px] text-sm bg-transparent border-none p-0 resize-none focus:ring-0 focus:outline-none"
                autoFocus
                onBlur={() => setSelectedNote(null)}
              />
            ) : (
              <div 
                className="text-sm whitespace-pre-wrap break-words cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedNote(note.id);
                }}
              >
                {note.content || 'Click to edit...'}
              </div>
            )}
          </Card>
        ))}

        {/* Images */}
        {images.map((image) => (
          <div
            key={image.id}
            className="absolute shadow-lg cursor-move select-none group"
            style={{
              left: image.position.x,
              top: image.position.y,
              width: image.width,
              height: image.height
            }}
            onMouseDown={() => handleMouseDown('image', image.id)}
          >
            <img
              src={image.url}
              alt="Mood board"
              className="w-full h-full object-cover rounded-lg"
              draggable={false}
            />
            <Button
              variant="ghost"
              size="sm"
              className="absolute -top-2 -right-2 h-6 w-6 p-0 bg-destructive text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => {
                e.stopPropagation();
                deleteImage(image.id);
              }}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
};