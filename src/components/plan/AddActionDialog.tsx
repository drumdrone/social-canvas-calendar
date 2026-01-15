import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface AddActionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  actionType: 'monthly' | 'weekly' | 'quarterly';
  onConfirm: (title: string, frequency: string) => void;
}

const ACTION_TYPE_LABELS = {
  monthly: 'měsíční akci',
  weekly: 'týdenní akci',
  quarterly: 'čtvrtletní kampaň',
};

const FREQUENCY_OPTIONS = {
  monthly: [
    { value: '1x', label: '1x měsíčně' },
    { value: '2x', label: '2x měsíčně' },
    { value: '3x', label: '3x měsíčně' },
    { value: '4x', label: '4x měsíčně' },
  ],
  weekly: [
    { value: '1x', label: '1x týdně' },
    { value: '2x', label: '2x týdně' },
    { value: '3x', label: '3x týdně' },
    { value: '4x', label: '4x týdně' },
  ],
  quarterly: [
    { value: '1x', label: '1x čtvrtletně' },
    { value: '2x', label: '2x čtvrtletně' },
    { value: '4x', label: '4x čtvrtletně' },
  ],
};

export const AddActionDialog: React.FC<AddActionDialogProps> = ({
  open,
  onOpenChange,
  actionType,
  onConfirm,
}) => {
  const [title, setTitle] = useState('');
  const [frequency, setFrequency] = useState('1x');

  const handleConfirm = () => {
    if (!title.trim()) return;

    onConfirm(title.trim(), frequency);
    setTitle('');
    setFrequency('1x');
    onOpenChange(false);
  };

  const handleCancel = () => {
    setTitle('');
    setFrequency('1x');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Přidat {ACTION_TYPE_LABELS[actionType]}</DialogTitle>
          <DialogDescription>
            Zadejte název akce a frekvenci opakování
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="title">Název akce</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="např. Recept týdne, Newsletter, Soutěž..."
              onKeyPress={(e) => {
                if (e.key === 'Enter' && title.trim()) {
                  handleConfirm();
                }
              }}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="frequency">Frekvence</Label>
            <Select value={frequency} onValueChange={setFrequency}>
              <SelectTrigger id="frequency">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FREQUENCY_OPTIONS[actionType].map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Zrušit
          </Button>
          <Button onClick={handleConfirm} disabled={!title.trim()}>
            Vytvořit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
