
import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Save, Calendar, RefreshCw, CloudOff, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { PlanMonth } from './PlanMonth';

interface PlanWeek {
  id: string;
  title: string;
  pillar: string;
  url: string;
  notes: string;
  post1_done?: boolean;
  post2_done?: boolean;
  post3_done?: boolean;
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
  const [planData, setPlanData] = useState<PlanData>({ months: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'syncing' | 'local'>('saved');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Load plan data from localStorage and database
  const loadPlanData = useCallback(async () => {
    setIsLoading(true);

    // First, load from localStorage for immediate UI update
    const localStorageKey = `plan-data-public`;
    const localData = localStorage.getItem(localStorageKey);
    const localTimestamp = localStorage.getItem(`${localStorageKey}-timestamp`);

    if (localData) {
      try {
        const parsedLocalData = JSON.parse(localData) as PlanData;
        setPlanData(parsedLocalData);
        setLastSaved(localTimestamp ? new Date(localTimestamp) : null);
      } catch (error) {
        console.error('Error parsing local data:', error);
      }
    }

    // Then, check database for newer data
    try {
      const { data, error } = await supabase
        .from('plan_sections')
        .select('section_data, updated_at')
        .eq('section_order', 0)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!error && data?.section_data) {
        const dbTimestamp = new Date(data.updated_at);
        const localTimestampDate = localTimestamp ? new Date(localTimestamp) : null;

        // Use database data if it's newer than local data
        if (!localTimestampDate || dbTimestamp > localTimestampDate) {
          const dbData = data.section_data as unknown as PlanData;
          setPlanData(dbData);
          setLastSaved(dbTimestamp);

          // Update localStorage with newer database data
          localStorage.setItem(localStorageKey, JSON.stringify(dbData));
          localStorage.setItem(`${localStorageKey}-timestamp`, dbTimestamp.toISOString());
        }
      }
    } catch (error) {
      console.error('Error loading from database, using local data:', error);
    }

    setIsLoading(false);
  }, []);

  // Save to localStorage immediately, sync to database in background
  const saveToLocalStorage = useCallback((data: PlanData) => {
    const localStorageKey = `plan-data-public`;
    const timestamp = new Date().toISOString();

    localStorage.setItem(localStorageKey, JSON.stringify(data));
    localStorage.setItem(`${localStorageKey}-timestamp`, timestamp);
    setLastSaved(new Date(timestamp));
    setSaveStatus('saved');
  }, []);

  // Background sync to database
  const syncToDatabase = useCallback(async (data: PlanData) => {
    setSaveStatus('syncing');
    try {
      const { error } = await supabase
        .from('plan_sections')
        .upsert({
          section_data: data as any,
          section_order: 0,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'section_order'
        });

      if (error) {
        console.error('Database sync failed:', error);
        setSaveStatus('local');
      } else {
        setSaveStatus('saved');
      }
    } catch (error) {
      console.error('Sync error:', error);
      setSaveStatus('local');
    }
  }, []);

  // Update plan data - save to localStorage immediately
  const updatePlanData = useCallback((updatedData: PlanData) => {
    setPlanData(updatedData);
    saveToLocalStorage(updatedData);
  }, [saveToLocalStorage]);

  // Auto-sync to database every 30 seconds
  useEffect(() => {
    if (planData.months.length === 0) return;

    const interval = setInterval(() => {
      syncToDatabase(planData);
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [planData, syncToDatabase]);

  useEffect(() => {
    loadPlanData();
  }, [loadPlanData]);

  const addMonth = () => {
    const newMonth: PlanMonthData = {
      id: crypto.randomUUID(),
      name: `Month ${new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`,
      color: '#6366f1',
      weeks: Array.from({ length: 2 }, () => ({
        id: crypto.randomUUID(),
        title: '',
        pillar: '',
        url: '',
        notes: '',
        post1_done: false,
        post2_done: false,
        post3_done: false,
      })),
    };

    const updatedData = {
      ...planData,
      months: [...planData.months, newMonth],
    };
    
    updatePlanData(updatedData);
  };

  const deleteMonth = (monthId: string) => {
    const updatedData = {
      ...planData,
      months: planData.months.filter(month => month.id !== monthId),
    };
    
    updatePlanData(updatedData);
  };

  const updateMonth = (monthId: string, updates: Partial<PlanMonthData>) => {
    const updatedData = {
      ...planData,
      months: planData.months.map(month =>
        month.id === monthId ? { ...month, ...updates } : month
      ),
    };
    
    updatePlanData(updatedData);
  };

  const manualSync = () => {
    syncToDatabase(planData);
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
            <div className="flex items-center gap-2">
              {saveStatus === 'saved' && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" />
                  Saved
                </Badge>
              )}
              {saveStatus === 'syncing' && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  <RefreshCw className="h-3 w-3 animate-spin" />
                  Syncing
                </Badge>
              )}
              {saveStatus === 'local' && (
                <Badge variant="outline" className="flex items-center gap-1">
                  <CloudOff className="h-3 w-3" />
                  Local Only
                </Badge>
              )}
              {lastSaved && (
                <span className="text-xs text-muted-foreground">
                  {lastSaved.toLocaleTimeString()}
                </span>
              )}
            </div>

            <Button
              onClick={manualSync}
              disabled={saveStatus === 'syncing'}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              {saveStatus === 'syncing' ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Sync
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
