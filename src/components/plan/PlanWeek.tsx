import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Trash2, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface PlanWeekData {
  id: string;
  title: string;
  pillar: string;
  url: string;
  notes: string;
}

interface PlanWeekProps {
  week: PlanWeekData;
  onUpdate: (updates: Partial<PlanWeekData>) => void;
  onDelete: () => void;
  canDelete: boolean;
}

export const PlanWeek: React.FC<PlanWeekProps> = ({
  week,
  onUpdate,
  onDelete,
  canDelete,
}) => {
  const [pillars, setPillars] = useState<Array<{ name: string; color: string }>>([]);

  useEffect(() => {
    const loadPillars = async () => {
      const { data } = await supabase
        .from('pillars')
        .select('name, color')
        .eq('is_active', true)
        .order('name');
      
      if (data) {
        setPillars(data);
      }
    };
    
    loadPillars();
  }, []);

  const handleInputChange = (field: keyof PlanWeekData, value: string) => {
    onUpdate({ [field]: value });
  };

  const selectedPillar = pillars.find(p => p.name === week.pillar);

  return (
    <Card className="h-full">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <Input
              placeholder="Week title..."
              value={week.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              className="font-medium"
            />
          </div>
          {canDelete && (
            <Button
              size="sm"
              variant="ghost"
              onClick={onDelete}
              className="ml-2 text-destructive hover:text-destructive"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
        </div>

        <div className="space-y-2">
          <select
            value={week.pillar}
            onChange={(e) => handleInputChange('pillar', e.target.value)}
            className="w-full px-3 py-2 border border-input rounded-md text-sm bg-background"
          >
            <option value="">Select pillar...</option>
            {pillars.map(pillar => (
              <option key={pillar.name} value={pillar.name}>
                {pillar.name}
              </option>
            ))}
          </select>
          
          {selectedPillar && (
            <Badge 
              variant="secondary" 
              className="text-xs"
              style={{ 
                backgroundColor: `${selectedPillar.color}20`,
                color: selectedPillar.color,
                borderColor: `${selectedPillar.color}40`
              }}
            >
              {selectedPillar.name}
            </Badge>
          )}
        </div>

        <div className="flex gap-2">
          <Input
            placeholder="URL..."
            value={week.url}
            onChange={(e) => handleInputChange('url', e.target.value)}
            className="flex-1 text-sm"
          />
          {week.url && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => window.open(week.url, '_blank')}
              className="flex-shrink-0"
            >
              <ExternalLink className="h-3 w-3" />
            </Button>
          )}
        </div>

        <Textarea
          placeholder="Notes..."
          value={week.notes}
          onChange={(e) => handleInputChange('notes', e.target.value)}
          rows={3}
          className="text-sm resize-none"
        />
      </CardContent>
    </Card>
  );
};