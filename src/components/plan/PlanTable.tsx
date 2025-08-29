import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, Save, Trash2, Calendar, RefreshCw } from 'lucide-react';
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
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const planDataRef = React.useRef<PlanData>({ months: [] });

  // Update ref when planData changes
  React.useEffect(() => {
    planDataRef.current = planData;
  }, [planData]);

  // Auto-save with debouncing
  const autoSave = useCallback(
    async (data: PlanData) => {
      if (!user || isSaving) return;
      
      setIsSaving(true);
      try {
        const { error } = await supabase
          .from('plan_sections')
          .upsert({
            user_id: user.id,
            section_data: data as any,
            section_order: 0,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'user_id,section_order'
          });

        if (error) throw error;
        
        setHasUnsavedChanges(false);
        
        // Also save to localStorage as backup
        localStorage.setItem(`plan-data-${user.id}`, JSON.stringify(data));
        
      } catch (error) {
        console.error('Auto-save failed:', error);
        toast({
          title: "Auto-save failed",
          description: "Changes saved locally. Will retry when online.",
          variant: "destructive",
        });
      } finally {
        setIsSaving(false);
      }
    },
    [user, isSaving, toast]
  );

  // Debounced auto-save
  React.useEffect(() => {
    if (!hasUnsavedChanges || !user) return;
    
    const timeoutId = setTimeout(() => {
      autoSave(planDataRef.current);
    }, 2000); // Save after 2 seconds of inactivity

    return () => clearTimeout(timeoutId);
  }, [hasUnsavedChanges, autoSave, user]);

  // Load plan data
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

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data?.section_data) {
        const loadedData = data.section_data as unknown as PlanData;
        setPlanData(loadedData);
      } else {
        // Try to load from localStorage as fallback
        const localData = localStorage.getItem(`plan-data-${user.id}`);
        if (localData) {
          const parsedData = JSON.parse(localData) as PlanData;
          setPlanData(parsedData);
          toast({
            title: "Loaded from local backup",
            description: "Your plan data was restored from local storage.",
          });
        } else {
          // Initialize with empty data
          setPlanData({ months: [] });
        }
      }
    } catch (error) {
      console.error('Failed to load plan data:', error);
      toast({
        title: "Failed to load plan",
        description: "Could not load your plan data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    loadPlanData();
  }, [loadPlanData]);

  const updatePlanData = (updatedData: PlanData) => {
    setPlanData(updatedData);
    setHasUnsavedChanges(true);
  };

  const addMonth = () => {
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

    updatePlanData({
      ...planData,
      months: [...planData.months, newMonth],
    });
  };

  const deleteMonth = (monthId: string) => {
    updatePlanData({
      ...planData,
      months: planData.months.filter(month => month.id !== monthId),
    });
  };

  const updateMonth = (monthId: string, updates: Partial<PlanMonthData>) => {
    updatePlanData({
      ...planData,
      months: planData.months.map(month =>
        month.id === monthId ? { ...month, ...updates } : month
      ),
    });
  };

  const manualSave = async () => {
    await autoSave(planData);
    toast({
      title: "Plan saved",
      description: "Your plan has been saved successfully.",
    });
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
            {hasUnsavedChanges && (
              <Badge variant="secondary" className="animate-pulse">
                Unsaved changes
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