import React, { useState } from 'react';
import { Plus, Upload, X, Palette } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

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

  const colors = [
    'bg-yellow-200', 'bg-pink-200', 'bg-blue-200', 'bg-green-200',
    'bg-purple-200', 'bg-orange-200', 'bg-red-200', 'bg-cyan-200'
  ];

  const addStickyNote = () => {
    if (!newNoteContent.trim()) return;
    
    const newNote: StickyNote = {
      id: Date.now().toString(),
      content: newNoteContent,
      color: colors[Math.floor(Math.random() * colors.length)],
      position: { x: Math.random() * 400, y: Math.random() * 300 }
    };
    
    setStickyNotes([...stickyNotes, newNote]);
    setNewNoteContent('');
  };

  const addImage = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const newImage: ImageNote = {
          id: Date.now().toString(),
          url: e.target?.result as string,
          position: { x: Math.random() * 300, y: Math.random() * 200 },
          width: 200,
          height: 150
        };
        setImages([...images, newImage]);
      };
      reader.readAsDataURL(file);
    }
    event.target.value = '';
  };

  const deleteNote = (id: string) => {
    setStickyNotes(stickyNotes.filter(note => note.id !== id));
  };

  const deleteImage = (id: string) => {
    setImages(images.filter(img => img.id !== id));
  };

  const updateNoteContent = (id: string, content: string) => {
    setStickyNotes(stickyNotes.map(note => 
      note.id === id ? { ...note, content } : note
    ));
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
      setStickyNotes(stickyNotes.map(note =>
        note.id === draggedItem.id ? { ...note, position: { x, y } } : note
      ));
    } else {
      setImages(images.map(img =>
        img.id === draggedItem.id ? { ...img, position: { x, y } } : img
      ));
    }
  };

  const handleMouseUp = () => {
    setDraggedItem(null);
  };

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
            onMouseDown={() => handleMouseDown('note', note.id)}
            onClick={() => setSelectedNote(selectedNote === note.id ? null : note.id)}
          >
            <div className="flex justify-between items-start mb-2">
              <Palette className="h-3 w-3 text-muted-foreground" />
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
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
                className="min-h-[60px] text-sm bg-transparent border-none p-0 resize-none"
                autoFocus
                onBlur={() => setSelectedNote(null)}
              />
            ) : (
              <div className="text-sm whitespace-pre-wrap break-words">
                {note.content}
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