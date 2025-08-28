import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Save, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface PlanRow {
  id: string;
  title: string;
  pillar: string;
  url: string;
  notes: string;
}

export const PlanTable = () => {
  const [rows, setRows] = useState<PlanRow[]>([]);
  const [editingCell, setEditingCell] = useState<{ rowId: string; field: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch pillars for the select dropdown
  const { data: pillars = [], isLoading: pillarsLoading, error: pillarsError } = useQuery({
    queryKey: ['pillars'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pillars')
        .select('*')
        .eq('is_active', true)
        .order('name');
      
      if (error) throw error;
      return data;
    }
  });

  // Fetch plan sections
  const { data: planSections, refetch, isLoading: sectionsLoading, error: sectionsError } = useQuery({
    queryKey: ['plan-sections'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('plan_sections')
        .select('*')
        .order('section_order');
      
      if (error) throw error;
      return data;
    }
  });

  useEffect(() => {
    setIsLoading(sectionsLoading || pillarsLoading);
    
    if (sectionsError || pillarsError) {
      setError(sectionsError?.message || pillarsError?.message || 'Failed to load data');
      setIsLoading(false);
      return;
    }

    if (!sectionsLoading && !pillarsLoading) {
      try {
        if (planSections && planSections.length > 0) {
          const sectionData = planSections[0]?.section_data as any;
          console.log('Plan section data:', sectionData);
          
          // Handle different data structures
          if (sectionData?.rows && Array.isArray(sectionData.rows)) {
            setRows(sectionData.rows);
          } else if (sectionData?.cells) {
            // Convert old cell-based structure to rows if needed
            console.warn('Converting old cell-based data structure');
            setRows([createEmptyRow()]);
          } else {
            setRows([createEmptyRow()]);
          }
        } else {
          // Initialize with empty rows
          setRows([createEmptyRow()]);
        }
        setError(null);
      } catch (err) {
        console.error('Error processing plan data:', err);
        setError('Failed to process plan data');
        setRows([createEmptyRow()]);
      }
      setIsLoading(false);
    }
  }, [planSections, sectionsLoading, pillarsLoading, sectionsError, pillarsError]);

  const createEmptyRow = (): PlanRow => ({
    id: crypto.randomUUID(),
    title: '',
    pillar: '',
    url: '',
    notes: ''
  });

  const addRow = () => {
    setRows([...rows, createEmptyRow()]);
  };

  const deleteRow = (rowId: string) => {
    setRows(rows.filter(row => row.id !== rowId));
  };

  const updateCell = (rowId: string, field: keyof PlanRow, value: string) => {
    setRows(rows.map(row => 
      row.id === rowId ? { ...row, [field]: value } : row
    ));
  };

const saveData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('You must be logged in to save data');
        return;
      }

      const sectionData = { rows } as any;
      
      // Check if we have existing data to update or need to insert
      if (planSections && planSections.length > 0) {
        const { error } = await supabase
          .from('plan_sections')
          .update({ section_data: sectionData })
          .eq('id', planSections[0].id);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('plan_sections')
          .insert([{
            user_id: user.id,
            section_data: sectionData,
            section_order: 0
          }]);
        
        if (error) throw error;
      }

      toast.success('Plan saved successfully');
      refetch();
    } catch (error) {
      console.error('Error saving plan:', error);
      toast.error('Failed to save plan');
    }
  };

  const handleCellClick = (rowId: string, field: string) => {
    setEditingCell({ rowId, field });
  };

  const handleCellBlur = () => {
    setEditingCell(null);
  };

  const renderCell = (row: PlanRow, field: keyof PlanRow) => {
    const isEditing = editingCell?.rowId === row.id && editingCell?.field === field;
    const value = row[field];

    if (field === 'pillar') {
      return (
        <Select
          value={value}
          onValueChange={(newValue) => updateCell(row.id, field, newValue)}
        >
          <SelectTrigger className="w-full min-w-[150px]">
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

    if (field === 'url') {
      return isEditing ? (
        <Input
          value={value}
          onChange={(e) => updateCell(row.id, field, e.target.value)}
          onBlur={handleCellBlur}
          autoFocus
          className="min-w-[200px]"
        />
      ) : (
        <div
          onClick={() => handleCellClick(row.id, field)}
          className="min-h-[40px] p-2 cursor-pointer hover:bg-muted/50 rounded border-dashed border border-transparent hover:border-border"
        >
          {value ? (
            <a href={value} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
              {value}
            </a>
          ) : (
            <span className="text-muted-foreground">Click to add URL</span>
          )}
        </div>
      );
    }

    return isEditing ? (
      <Input
        value={value}
        onChange={(e) => updateCell(row.id, field, e.target.value)}
        onBlur={handleCellBlur}
        autoFocus
        className="min-w-[150px]"
      />
    ) : (
      <div
        onClick={() => handleCellClick(row.id, field)}
        className="min-h-[40px] p-2 cursor-pointer hover:bg-muted/50 rounded border-dashed border border-transparent hover:border-border"
      >
        {value || <span className="text-muted-foreground">Click to edit</span>}
      </div>
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Content Planning Table</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-8">
            <div className="text-muted-foreground">Loading...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Content Planning Table</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-8">
            <div className="text-destructive">Error: {error}</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Content Planning Table</CardTitle>
        <div className="flex gap-2">
          <Button onClick={addRow} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Row
          </Button>
          <Button onClick={saveData} size="sm" variant="outline">
            <Save className="h-4 w-4 mr-2" />
            Save
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Pillar</TableHead>
                <TableHead>URL</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead className="w-[50px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="min-w-[200px]">
                    {renderCell(row, 'title')}
                  </TableCell>
                  <TableCell className="min-w-[150px]">
                    {renderCell(row, 'pillar')}
                  </TableCell>
                  <TableCell className="min-w-[200px]">
                    {renderCell(row, 'url')}
                  </TableCell>
                  <TableCell className="min-w-[200px]">
                    {renderCell(row, 'notes')}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteRow(row.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};