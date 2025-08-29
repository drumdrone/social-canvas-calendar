
import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Save, Calendar, RefreshCw, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { PlanMonth } from './PlanMonth';
import { useToast } from '@/hooks/use-toast';

interface PlanWeek {
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
  weeks: PlanWeek[];
}

interface PlanData {
  months: PlanMonthData[];
}

export const PlanTable: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [planData, setPlanData] = useState<PlanData>({ months: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Load plan data from database
  const loadPlanData = useCallback(async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('plan_sections')
        .select('section_data')
        .eq('user_id', user.id)
        .eq('section_order', 0)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Failed to load plan data:', error);
        toast({
          title: "Failed to load plan",
          description: "Could not load your plan data. Please refresh the page.",
          variant: "destructive",
        });
        return;
      }

      if (data?.section_data) {
        const loadedData = data.section_data as unknown as PlanData;
        setPlanData(loadedData);
      } else {
        // Initialize with empty data
        setPlanData({ months: [] });
      }
    } catch (error) {
      console.error('Error loading plan data:', error);
      toast({
        title: "Error loading plan",
        description: "Something went wrong loading your plan.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [user, toast]);

  // Save plan data to database immediately
  const savePlanData = useCallback(async (data: PlanData) => {
    if (!user) {
      console.error('No user authenticated');
      return false;
    }
    
    setIsSaving(true);
    try {
      // First, check if a record exists for this user and section_order
      const { data: existingRecord, error: queryError } = await supabase
        .from('plan_sections')
        .select('id')
        .eq('user_id', user.id)
        .eq('section_order', 0)
        .maybeSingle();

      if (queryError) {
        console.error('Query error:', queryError);
        toast({
          title: "Save failed",
          description: `Database query failed: ${queryError.message}`,
          variant: "destructive",
        });
        return false;
      }

      // Prepare the data to save
      const saveData = {
        user_id: user.id,
        section_data: data as any,
        section_order: 0,
        updated_at: new Date().toISOString()
      };

      let error;
      if (existingRecord) {
        // Update existing record
        const { error: updateError } = await supabase
          .from('plan_sections')
          .update(saveData)
          .eq('id', existingRecord.id);
        error = updateError;
      } else {
        // Insert new record
        const { error: insertError } = await supabase
          .from('plan_sections')
          .insert(saveData);
        error = insertError;
      }

      if (error) {
        console.error('Save error:', error);
        toast({
          title: "Save failed",
          description: `Database error: ${error.message}`,
          variant: "destructive",
        });
        return false;
      }

      return true;
    } catch (error) {
      console.error('Save error:', error);
      toast({
        title: "Save failed", 
        description: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [user, toast]);

  // Update plan data and save to database
  const updatePlanData = useCallback(async (updatedData: PlanData) => {
    setPlanData(updatedData);
    await savePlanData(updatedData);
  }, [savePlanData]);

  useEffect(() => {
    loadPlanData();
  }, [loadPlanData]);

  const addMonth = async () => {
    const newMonth: PlanMonthData = {
      id: crypto.randomUUID(),
      name: `Month ${new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`,
      color: '#6366f1',
      weeks: Array.from({ length: 4 }, () => ({
        id: crypto.randomUUID(),
        title: '',
        pillar: '',
        url: '',
        notes: '',
      })),
    };

    const updatedData = {
      ...planData,
      months: [...planData.months, newMonth],
    };
    
    await updatePlanData(updatedData);
  };

  const deleteMonth = async (monthId: string) => {
    const updatedData = {
      ...planData,
      months: planData.months.filter(month => month.id !== monthId),
    };
    
    await updatePlanData(updatedData);
  };

  const updateMonth = async (monthId: string, updates: Partial<PlanMonthData>) => {
    const updatedData = {
      ...planData,
      months: planData.months.map(month =>
        month.id === monthId ? { ...month, ...updates } : month
      ),
    };
    
    await updatePlanData(updatedData);
  };

  const manualSave = async () => {
    const success = await savePlanData(planData);
    if (success) {
      toast({
        title: "Plan saved",
        description: "Your plan has been saved successfully.",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex items-center gap-2">
          <RefreshCw className="h-4 w-4 animate-spin" />
          <span>Loading your plan...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 overflow-auto">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Content Plan</h1>
            <p className="text-muted-foreground">
              Plan your content strategy by months and weeks
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Save Status */}
            {isSaving && (
              <Badge variant="secondary" className="animate-pulse">
                Saving...
              </Badge>
            )}

            <Button
              onClick={manualSave}
              disabled={isSaving}
              className="flex items-center gap-2"
            >
              {isSaving ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Save Plan
            </Button>
            <Button onClick={addMonth} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add Month
            </Button>
          </div>
        </div>

        {/* Plan Content */}
        {planData.months.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No months planned yet</h3>
              <p className="text-muted-foreground mb-4">
                Start planning your content by adding your first month
              </p>
              <Button onClick={addMonth} className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Add Your First Month
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {planData.months.map((month, index) => (
              <PlanMonth
                key={month.id}
                month={month}
                onUpdate={(updates) => updateMonth(month.id, updates)}
                onDelete={() => deleteMonth(month.id)}
                canDelete={planData.months.length > 1}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
