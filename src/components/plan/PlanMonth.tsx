import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Trash2, Edit2, Check, X, Calendar } from 'lucide-react';
import { PlanWeek } from './PlanWeek';

interface PlanWeekData {
  id: string;
  title: string;
  pillar: string;
  url: string;
  notes: string;
}

interface PlanMonthData {
  id: string;
  name: string;
  color: string;
  weeks: PlanWeekData[];
}

interface PlanMonthProps {
  month: PlanMonthData;
  onUpdate: (updates: Partial<PlanMonthData>) => void;
  onDelete: () => void;
  canDelete: boolean;
}

export const PlanMonth: React.FC<PlanMonthProps> = ({
  month,
  onUpdate,
  onDelete,
  canDelete,
}) => {
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState(month.name);

  const handleNameSave = () => {
    onUpdate({ name: tempName });
    setIsEditingName(false);
  };

  const handleNameCancel = () => {
    setTempName(month.name);
    setIsEditingName(false);
  };

  const updateWeek = (weekIndex: number, updates: Partial<PlanWeekData>) => {
    const updatedWeeks = [...month.weeks];
    updatedWeeks[weekIndex] = { ...updatedWeeks[weekIndex], ...updates };
    onUpdate({ weeks: updatedWeeks });
  };

  // Ensure we always have exactly 4 weeks
  const ensureFourWeeks = () => {
    const weeks = [...month.weeks];
    while (weeks.length < 4) {
      weeks.push({
        id: crypto.randomUUID(),
        title: '',
        pillar: '',
        url: '',
        notes: '',
      });
    }
    return weeks.slice(0, 4); // Ensure max 4 weeks
  };

  const displayWeeks = ensureFourWeeks();

  const colorOptions = [
    '#6366f1', '#8b5cf6', '#ec4899', '#ef4444', '#f97316',
    '#f59e0b', '#eab308', '#84cc16', '#22c55e', '#10b981',
    '#14b8a6', '#06b6d4', '#0ea5e9', '#3b82f6'
  ];

  return (
    <Card className="overflow-hidden" style={{ borderTopColor: month.color, borderTopWidth: '4px' }}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Calendar className="h-5 w-5 text-muted-foreground" />
            {isEditingName ? (
              <div className="flex items-center gap-2">
                <Input
                  value={tempName}
                  onChange={(e) => setTempName(e.target.value)}
                  className="text-lg font-semibold"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleNameSave();
                    if (e.key === 'Escape') handleNameCancel();
                  }}
                />
                <Button size="sm" variant="ghost" onClick={handleNameSave}>
                  <Check className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="ghost" onClick={handleNameCancel}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <CardTitle className="text-xl">{month.name}</CardTitle>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setIsEditingName(true)}
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              {colorOptions.map(color => (
                <button
                  key={color}
                  className={`w-4 h-4 rounded-full border-2 ${
                    month.color === color ? 'border-foreground' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: color }}
                  onClick={() => onUpdate({ color })}
                />
              ))}
            </div>
            
            {canDelete && (
              <Button
                size="sm"
                variant="ghost"
                onClick={onDelete}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          <Badge variant="secondary">
            4 weeks
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-4">
          {displayWeeks.map((week, index) => (
            <div key={week.id || `week-${index}`} className="flex items-start gap-4 p-4 border rounded-lg bg-muted/20">
              <div className="flex-shrink-0 w-20 pt-2">
                <Badge variant="outline" className="text-sm font-medium">
                  {index + 1}. week
                </Badge>
              </div>
              <div className="flex-1">
                <PlanWeek
                  week={week}
                  onUpdate={(updates) => updateWeek(index, updates)}
                  onDelete={() => {}}
                  canDelete={false}
                  isInline={true}
                />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};