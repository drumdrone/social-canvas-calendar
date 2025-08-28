import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Plus, X, Save, FileText } from 'lucide-react';
import { format } from 'date-fns';

interface PlanNote {
  id: string;
  date: string;
  title: string;
  content: string;
  color: string;
  category: string;
}

interface PlanningPanelProps {
  selectedDate: Date | null;
  isOpen: boolean;
  onClose: () => void;
}

export const PlanningPanel: React.FC<PlanningPanelProps> = ({
  selectedDate,
  isOpen,
  onClose,
}) => {
  const [notes, setNotes] = useState<PlanNote[]>([]);
  const [newNote, setNewNote] = useState({ title: '', content: '', category: 'general' });
  const [isAddingNote, setIsAddingNote] = useState(false);

  const colors = [
    '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', 
    '#06B6D4', '#84CC16', '#F97316', '#EC4899'
  ];

  const categories = [
    'general', 'content-ideas', 'campaigns', 'deadlines', 'meetings'
  ];

  // Load notes from localStorage on component mount
  useEffect(() => {
    const savedNotes = localStorage.getItem('planning-notes');
    if (savedNotes) {
      try {
        setNotes(JSON.parse(savedNotes));
      } catch (error) {
        console.error('Error parsing saved notes:', error);
      }
    }
  }, []);

  // Save notes to localStorage whenever notes change
  useEffect(() => {
    localStorage.setItem('planning-notes', JSON.stringify(notes));
  }, [notes]);

  const getNotesForDate = () => {
    if (!selectedDate) return [];
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    return notes.filter(note => note.date === dateStr);
  };

  const addNote = () => {
    if (!selectedDate || !newNote.title.trim()) return;

    const note: PlanNote = {
      id: crypto.randomUUID(),
      date: format(selectedDate, 'yyyy-MM-dd'),
      title: newNote.title,
      content: newNote.content,
      color: colors[Math.floor(Math.random() * colors.length)],
      category: newNote.category,
    };

    setNotes(prev => [...prev, note]);
    setNewNote({ title: '', content: '', category: 'general' });
    setIsAddingNote(false);
  };

  const deleteNote = (noteId: string) => {
    setNotes(prev => prev.filter(note => note.id !== noteId));
  };

  const updateNote = (noteId: string, updates: Partial<PlanNote>) => {
    setNotes(prev => prev.map(note => 
      note.id === noteId ? { ...note, ...updates } : note
    ));
  };

  const dateNotes = getNotesForDate();

  if (!isOpen || !selectedDate) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Planning for {format(selectedDate, 'MMMM d, yyyy')}
            </CardTitle>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        
        <CardContent className="overflow-y-auto">
          <div className="space-y-4">
            {/* Add new note form */}
            {isAddingNote ? (
              <Card>
                <CardContent className="p-4 space-y-3">
                  <Input
                    placeholder="Note title..."
                    value={newNote.title}
                    onChange={(e) => setNewNote(prev => ({ ...prev, title: e.target.value }))}
                  />
                  <Textarea
                    placeholder="Note content..."
                    value={newNote.content}
                    onChange={(e) => setNewNote(prev => ({ ...prev, content: e.target.value }))}
                    rows={3}
                  />
                  <div className="flex items-center justify-between">
                    <select
                      value={newNote.category}
                      onChange={(e) => setNewNote(prev => ({ ...prev, category: e.target.value }))}
                      className="px-3 py-1 border rounded-md text-sm"
                    >
                      {categories.map(cat => (
                        <option key={cat} value={cat}>
                          {cat.replace('-', ' ')}
                        </option>
                      ))}
                    </select>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={addNote}>
                        <Save className="h-3 w-3 mr-1" />
                        Save
                      </Button>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        onClick={() => setIsAddingNote(false)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Button 
                onClick={() => setIsAddingNote(true)} 
                className="w-full"
                variant="outline"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Planning Note
              </Button>
            )}

            {/* Existing notes */}
            {dateNotes.length > 0 ? (
              <div className="space-y-3">
                {dateNotes.map(note => (
                  <Card key={note.id} className="border-l-4" style={{ borderLeftColor: note.color }}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-medium">{note.title}</h4>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-xs">
                            {note.category.replace('-', ' ')}
                          </Badge>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => deleteNote(note.id)}
                            className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      {note.content && (
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                          {note.content}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No planning notes for this date yet.</p>
                <p className="text-sm">Click "Add Planning Note" to get started.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
