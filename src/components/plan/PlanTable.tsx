import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { MonthSection, MonthData, WeekRow } from './MonthSection';
import { Plus } from 'lucide-react';

export const PlanTable = () => {
  const [months, setMonths] = useState<MonthData[]>([]);
  const [editingCell, setEditingCell] = useState<{ monthId: string; weekId: string; field: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

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
          
          // Handle new month-based structure
          if (sectionData?.months && Array.isArray(sectionData.months)) {
            setMonths(sectionData.months);
          } else if (sectionData?.cells && Array.isArray(sectionData.cells)) {
            // Migration from old cells format to new months format
            const migratedMonths = migrateCellsToMonths(sectionData.cells);
            setMonths(migratedMonths);
            // Auto-save the migrated data
            setTimeout(() => saveData(), 1000);
          } else {
            // Initialize with one empty month
            setMonths([createEmptyMonth()]);
          }
        } else {
          // Initialize with one empty month
          setMonths([createEmptyMonth()]);
        }
        setError(null);
      } catch (err) {
        console.error('Error processing plan data:', err);
        setError('Failed to process plan data');
        setMonths([createEmptyMonth()]);
      }
      setIsLoading(false);
    }
  }, [planSections, sectionsLoading, pillarsLoading, sectionsError, pillarsError]);

  const createEmptyWeek = (): WeekRow => ({
    id: crypto.randomUUID(),
    title: '',
    pillar: '',
    url: '',
    notes: '',
  });

  const createEmptyMonth = (): MonthData => ({
    id: crypto.randomUUID(),
    name: `Month ${new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`,
    color: '#3B82F6',
    weeks: Array.from({ length: 4 }, () => createEmptyWeek()),
  });

  const addMonth = () => {
    const newMonth = createEmptyMonth();
    setMonths([...months, newMonth]);
  };

  const deleteMonth = (monthId: string) => {
    setMonths(months.filter(month => month.id !== monthId));
  };

  const updateMonth = (monthId: string, updates: Partial<MonthData>) => {
    setMonths(months.map(month => 
      month.id === monthId ? { ...month, ...updates } : month
    ));
  };

  const migrateCellsToMonths = (cells: any[]): MonthData[] => {
    // Group cells by month if they have month indicators, or create two default months
    const monthGroups: { [key: string]: any[] } = {};
    
    cells.forEach((cell, index) => {
      const content = cell.content || '';
      
      // Try to detect month from content or position
      if (content.toLowerCase().includes('září') || content.toLowerCase().includes('september')) {
        if (!monthGroups['Září 2024']) monthGroups['Září 2024'] = [];
        monthGroups['Září 2024'].push(cell);
      } else if (content.toLowerCase().includes('říjen') || content.toLowerCase().includes('october')) {
        if (!monthGroups['Říjen 2024']) monthGroups['Říjen 2024'] = [];
        monthGroups['Říjen 2024'].push(cell);
      } else {
        // Default grouping by position
        const monthKey = index < cells.length / 2 ? 'Září 2024' : 'Říjen 2024';
        if (!monthGroups[monthKey]) monthGroups[monthKey] = [];
        monthGroups[monthKey].push(cell);
      }
    });

    return Object.entries(monthGroups).map(([monthName, cellGroup]) => {
      const weeks: WeekRow[] = [];
      
      // Group cells into weeks (4 cells per week)
      for (let i = 0; i < 4; i++) {
        const weekCells = cellGroup.slice(i * 4, (i + 1) * 4);
        const week: WeekRow = {
          id: crypto.randomUUID(),
          title: '',
          pillar: '',
          url: '',
          notes: '',
        };

        // Extract content from week cells
        weekCells.forEach((cell, cellIndex) => {
          const content = cell.content || '';
          switch (cellIndex) {
            case 0:
              week.title = content;
              break;
            case 1:
              week.pillar = content;
              break;
            case 2:
              week.url = content;
              break;
            case 3:
              week.notes = content;
              break;
          }
        });

        weeks.push(week);
      }

      // Ensure we always have 4 weeks
      while (weeks.length < 4) {
        weeks.push(createEmptyWeek());
      }

      return {
        id: crypto.randomUUID(),
        name: monthName,
        color: monthName.includes('Září') ? '#10B981' : '#F59E0B',
        weeks: weeks.slice(0, 4),
      };
    });
  };

  const saveData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "Authentication required",
          description: "Please log in to save your plan data.",
          variant: "destructive",
        });
        return;
      }

      const dataToSave = {
        user_id: user.id,
        section_data: { months } as any,
        section_order: 0,
      };

      // Try to update existing data first
      const { data: existingData } = await supabase
        .from('plan_sections')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (existingData) {
        const { error } = await supabase
          .from('plan_sections')
          .update({ section_data: { months } as any, updated_at: new Date().toISOString() })
          .eq('id', existingData.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('plan_sections')
          .insert([dataToSave]);

        if (error) throw error;
      }

      toast({
        title: "Success",
        description: "Plan data saved successfully!",
      });
    } catch (error: any) {
      console.error('Error saving plan data:', error);
      toast({
        title: "Error",
        description: "Failed to save plan data. Please try again.",
        variant: "destructive",
      });
    }
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
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Content Planning - Monthly & Weekly Structure</CardTitle>
          <div className="flex gap-2">
            <Button onClick={addMonth} variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Add Month
            </Button>
            <Button onClick={saveData}>
              Save Plan
            </Button>
          </div>
        </CardHeader>
      </Card>

      {months.map((month) => (
        <MonthSection
          key={month.id}
          month={month}
          pillars={pillars}
          onUpdateMonth={updateMonth}
          onDeleteMonth={deleteMonth}
          editingCell={editingCell}
          setEditingCell={setEditingCell}
        />
      ))}

      {months.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-muted-foreground mb-4">No months added yet.</p>
            <Button onClick={addMonth}>
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Month
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};