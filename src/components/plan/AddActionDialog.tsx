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
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

interface AddActionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  actionType: 'monthly' | 'weekly' | 'quarterly';
  onConfirm: (repeatFor12Months: boolean) => void;
}

const ACTION_TYPE_LABELS = {
  monthly: 'měsíční akci',
  weekly: 'týdenní akci',
  quarterly: 'čtvrtletní kampaň',
};

export const AddActionDialog: React.FC<AddActionDialogProps> = ({
  open,
  onOpenChange,
  actionType,
  onConfirm,
}) => {
  const [repeatFor12Months, setRepeatFor12Months] = useState(false);

  const handleConfirm = () => {
    onConfirm(repeatFor12Months);
    setRepeatFor12Months(false);
    onOpenChange(false);
  };

  const handleCancel = () => {
    setRepeatFor12Months(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Přidat {ACTION_TYPE_LABELS[actionType]}</DialogTitle>
          <DialogDescription>
            Vytvořte novou akci pro aktuální měsíc
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="repeat"
              checked={repeatFor12Months}
              onCheckedChange={(checked) => setRepeatFor12Months(checked as boolean)}
            />
            <Label
              htmlFor="repeat"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
            >
              Opakovat pro dalších 12 měsíců
            </Label>
          </div>
          {repeatFor12Months && (
            <p className="text-xs text-muted-foreground mt-2 ml-6">
              Vytvoří se celkem 12 kopií této akce, každá pro následující měsíc
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Zrušit
          </Button>
          <Button onClick={handleConfirm}>
            Vytvořit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
