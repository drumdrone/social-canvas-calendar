import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, X, Check } from 'lucide-react';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';

interface PostQuickAddProps {
  onAdd: (title: string, date: Date) => Promise<void>;
  onCancel: () => void;
}

export const PostQuickAdd: React.FC<PostQuickAddProps> = ({ onAdd, onCancel }) => {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState<Date>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!title.trim() || !date) return;

    setIsSubmitting(true);
    try {
      await onAdd(title, date);
      setTitle('');
      setDate(undefined);
    } catch (error) {
      console.error('Error adding post:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setTitle('');
    setDate(undefined);
    onCancel();
  };

  return (
    <div className="flex items-center gap-2 p-2 border rounded-md bg-background">
      <Input
        placeholder="Nadpis postu..."
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && title && date) handleSubmit();
          if (e.key === 'Escape') handleCancel();
        }}
        className="flex-1"
        autoFocus
      />

      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={`justify-start text-left font-normal ${!date && 'text-muted-foreground'}`}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date ? format(date, 'd.M.yyyy', { locale: cs }) : 'Datum'}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={date}
            onSelect={setDate}
            initialFocus
            locale={cs}
          />
        </PopoverContent>
      </Popover>

      <Button
        size="sm"
        onClick={handleSubmit}
        disabled={!title.trim() || !date || isSubmitting}
      >
        <Check className="h-4 w-4" />
      </Button>

      <Button
        size="sm"
        variant="ghost"
        onClick={handleCancel}
        disabled={isSubmitting}
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
};
