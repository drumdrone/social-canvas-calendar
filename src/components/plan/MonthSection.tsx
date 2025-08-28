import React, { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trash2, Edit, Check, X, Upload, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface WeekRow {
  id: string;
  title: string;
  pillar: string;
  url: string;
  notes: string;
}

export interface MonthData {
  id: string;
  name: string;
  color: string;
  weeks: WeekRow[];
}

interface MonthSectionProps {
  month: MonthData;
  pillars: Array<{ id: string; name: string; color: string }>;
  onUpdateMonth: (monthId: string, updates: Partial<MonthData>) => void;
  onDeleteMonth: (monthId: string) => void;
  editingCell: { monthId: string; weekId: string; field: string } | null;
  setEditingCell: (cell: { monthId: string; weekId: string; field: string } | null) => void;
}

export const MonthSection: React.FC<MonthSectionProps> = ({
  month,
  pillars,
  onUpdateMonth,
  onDeleteMonth,
  editingCell,
  setEditingCell,
}) => {
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState(month.name);
  
  const { toast } = useToast();

  const handleNameSave = () => {
    onUpdateMonth(month.id, { name: tempName });
    setIsEditingName(false);
  };

  const handleNameCancel = () => {
    setTempName(month.name);
    setIsEditingName(false);
  };

  const updateWeek = (weekId: string, field: keyof WeekRow, value: string) => {
    const updatedWeeks = month.weeks.map(week =>
      week.id === weekId ? { ...week, [field]: value } : week
    );
    onUpdateMonth(month.id, { weeks: updatedWeeks });
  };


  const deleteUrl = (weekId: string) => {
    updateWeek(weekId, 'url', '');
  };

  const openUrl = (url: string) => {
    if (url) {
      window.open(url.startsWith('http') ? url : `https://${url}`, '_blank');
    }
  };


  const handleCellClick = (weekId: string, field: string) => {
    setEditingCell({ monthId: month.id, weekId, field });
  };

  const handleCellBlur = () => {
    setEditingCell(null);
  };

  const renderCell = (week: WeekRow, field: keyof WeekRow) => {
    const isEditing = editingCell?.monthId === month.id && 
                     editingCell?.weekId === week.id && 
                     editingCell?.field === field;

    if (isEditing) {
      if (field === 'pillar') {
        return (
          <Select
            value={week[field] || ''}
            onValueChange={(value) => updateWeek(week.id, field, value)}
            onOpenChange={(open) => !open && handleCellBlur()}
          >
            <SelectTrigger className="h-8">
              <SelectValue placeholder="Select pillar" />
            </SelectTrigger>
            <SelectContent>
              {pillars.map((pillar) => (
                <SelectItem key={pillar.id} value={pillar.name}>
                  {pillar.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      }

      return (
        <Input
          value={week[field] || ''}
          onChange={(e) => updateWeek(week.id, field, e.target.value)}
          onBlur={handleCellBlur}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleCellBlur();
            if (e.key === 'Escape') handleCellBlur();
          }}
          className="h-8"
          autoFocus
        />
      );
    }

    if (field === 'url' && week[field]) {
      return (
        <div className="flex items-center gap-2 p-1">
          <a
            href={week[field]}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline flex-1 truncate"
            onClick={(e) => e.stopPropagation()}
          >
            {week[field]}
          </a>
          <Button
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0"
            onClick={(e) => {
              e.stopPropagation();
              openUrl(week[field]);
            }}
          >
            <ExternalLink className="h-3 w-3" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0"
            onClick={(e) => {
              e.stopPropagation();
              handleCellClick(week.id, field);
            }}
          >
            <Edit className="h-3 w-3" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0 text-destructive"
            onClick={(e) => {
              e.stopPropagation();
              deleteUrl(week.id);
            }}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      );
    }

    return (
      <div
        onClick={() => handleCellClick(week.id, field)}
        className="cursor-pointer hover:bg-muted/50 p-1 rounded min-h-[32px] flex items-center"
      >
        {week[field] || ''}
      </div>
    );
  };

  return (
    <Card className="mb-6">
      <CardHeader 
        className="pb-4"
        style={{ backgroundColor: `${month.color}20` }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isEditingName ? (
              <div className="flex items-center gap-2">
                <Input
                  value={tempName}
                  onChange={(e) => setTempName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleNameSave();
                    if (e.key === 'Escape') handleNameCancel();
                  }}
                  className="text-xl font-bold"
                  autoFocus
                />
                <Button size="sm" variant="ghost" onClick={handleNameSave}>
                  <Check className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="ghost" onClick={handleNameCancel}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <>
                <h1 
                  className="text-2xl font-bold cursor-pointer hover:bg-muted/20 p-2 rounded"
                  style={{ color: month.color }}
                  onClick={() => setIsEditingName(true)}
                >
                  {month.name}
                </h1>
                <Button size="sm" variant="ghost" onClick={() => setIsEditingName(true)}>
                  <Edit className="h-4 w-4" />
                </Button>
              </>
            )}
            <input
              type="color"
              value={month.color}
              onChange={(e) => onUpdateMonth(month.id, { color: e.target.value })}
              className="w-8 h-8 rounded cursor-pointer border border-border"
              title="Change month color"
            />
          </div>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => onDeleteMonth(month.id)}
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Delete Month
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">Week</TableHead>
              <TableHead className="w-[150px]">Title</TableHead>
              <TableHead className="w-[120px]">Pillar</TableHead>
              <TableHead className="w-[200px]">URL</TableHead>
              
              <TableHead>Notes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {month.weeks.map((week, index) => (
              <TableRow key={week.id}>
                <TableCell className="font-medium">Week {index + 1}</TableCell>
                <TableCell>{renderCell(week, 'title')}</TableCell>
                <TableCell>{renderCell(week, 'pillar')}</TableCell>
                <TableCell>{renderCell(week, 'url')}</TableCell>
                <TableCell>{renderCell(week, 'notes')}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};