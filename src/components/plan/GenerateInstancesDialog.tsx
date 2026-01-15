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

interface GenerateInstancesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (monthsCount: number) => void;
}

export const GenerateInstancesDialog: React.FC<GenerateInstancesDialogProps> = ({
  open,
  onOpenChange,
  onConfirm,
}) => {
  const [monthsCount, setMonthsCount] = useState<string>('12');

  const handleConfirm = () => {
    onConfirm(parseInt(monthsCount));
    setMonthsCount('12');
    onOpenChange(false);
  };

  const handleCancel = () => {
    setMonthsCount('12');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Generovat instance ze šablony</DialogTitle>
          <DialogDescription>
            Vyberte pro kolik měsíců se mají vytvořit instance
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <RadioGroup value={monthsCount} onValueChange={setMonthsCount}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="3" id="g1" />
              <Label htmlFor="g1" className="cursor-pointer">
                3 měsíce
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="6" id="g2" />
              <Label htmlFor="g2" className="cursor-pointer">
                6 měsíců
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="12" id="g3" />
              <Label htmlFor="g3" className="cursor-pointer">
                12 měsíců
              </Label>
            </div>
          </RadioGroup>
          <p className="text-xs text-muted-foreground mt-3">
            Vytvoří se instance pro následujících {monthsCount} měsíců od aktuálního měsíce
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Zrušit
          </Button>
          <Button onClick={handleConfirm}>
            Generovat
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
