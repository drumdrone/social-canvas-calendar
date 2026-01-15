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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';

interface AddActionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  actionType: 'monthly' | 'weekly' | 'quarterly';
  onConfirm: (monthsCount: number) => void;
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
  const [monthsCount, setMonthsCount] = useState<string>('1');

  const handleConfirm = () => {
    onConfirm(parseInt(monthsCount));
    setMonthsCount('1');
    onOpenChange(false);
  };

  const handleCancel = () => {
    setMonthsCount('1');
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
          <RadioGroup value={monthsCount} onValueChange={setMonthsCount}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="1" id="r1" />
              <Label htmlFor="r1" className="cursor-pointer">
                Pouze tento měsíc
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="6" id="r2" />
              <Label htmlFor="r2" className="cursor-pointer">
                Opakovat pro dalších 6 měsíců
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="12" id="r3" />
              <Label htmlFor="r3" className="cursor-pointer">
                Opakovat pro dalších 12 měsíců
              </Label>
            </div>
          </RadioGroup>
          {monthsCount !== '1' && (
            <p className="text-xs text-muted-foreground mt-3">
              Vytvoří se celkem {monthsCount} kopií této akce, každá pro následující měsíc
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
