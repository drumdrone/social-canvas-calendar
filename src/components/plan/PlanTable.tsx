import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, Save, Trash2, Calendar, RefreshCw, Wifi, WifiOff, AlertCircle } from 'lucide-react';
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
  const { user, refreshSession } = useAuth();
  const { toast } = useToast();
  const [planData, setPlanData] = useState<PlanData>({ months: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'failed' | 'local' | 'syncing'>('saved');
  const [retryCount, setRetryCount] = useState(0);
  const planDataRef = useRef<PlanData>({ months: [] });
  const saveQueueRef = useRef<PlanData[]>([]);
  const lastSavedRef = useRef<string>('');

  // Update ref when planData changes
  useEffect(() => {
    planDataRef.current = planData;
  }, [planData]);

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      syncQueuedChanges();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Sync queued changes when back online
  const syncQueuedChanges = useCallback(async () => {
    if (saveQueueRef.current.length === 0) return;
    
    setSaveStatus('syncing');
    const latestData = saveQueueRef.current[saveQueueRef.current.length - 1];
    saveQueueRef.current = [];
    
    await autoSave(latestData, true);
  }, []);

  // Enhanced autosave with retry logic
  const autoSave = useCallback(
    async (data: PlanData, isRetry = false, attempt = 1) => {
      if (!user) return;
      
      if (!isOnline) {
        // Queue for later sync
        saveQueueRef.current.push(data);
        localStorage.setItem(`plan-data-${user.id}`, JSON.stringify(data));
        setSaveStatus('local');
        setHasUnsavedChanges(false);
        if (!isRetry) {
          toast({
            title: "Saved locally",
            description: "Will sync when online.",
          });
        }
        return;
      }

      if (isSaving && !isRetry) return;
      
      setIsSaving(true);
      setSaveStatus('saving');
      
      try {
        // Check and refresh auth if needed
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          await refreshSession();
        }

        // Generate timestamp for conflict detection
        const timestamp = new Date().toISOString();
        const dataHash = JSON.stringify(data);
        
        // Only save if data actually changed
        if (lastSavedRef.current === dataHash && !isRetry) {
          setSaveStatus('saved');
          setIsSaving(false);
          return;
        }

        const { error } = await supabase
          .from('plan_sections')
          .upsert({
            user_id: user.id,
            section_data: data as any,
            section_order: 0,
            updated_at: timestamp
          }, {
            onConflict: 'user_id,section_order'
          });

        if (error) throw error;
        
        lastSavedRef.current = dataHash;
        setHasUnsavedChanges(false);
        setSaveStatus('saved');
        setRetryCount(0);
        
        // Also save to localStorage as backup
        localStorage.setItem(`plan-data-${user.id}`, JSON.stringify(data));
        
        if (isRetry) {
          toast({
            title: "Sync successful",
            description: "Your changes have been saved to the cloud.",
          });
        }
        
      } catch (error: any) {
        console.error('Auto-save failed:', error, { attempt, user: user?.id });
        setSaveStatus('failed');
        
        // Save locally as fallback
        localStorage.setItem(`plan-data-${user.id}`, JSON.stringify(data));
        
        // Retry logic with exponential backoff
        if (attempt < 3) {
          const delay = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
          setTimeout(() => {
            autoSave(data, true, attempt + 1);
          }, delay);
          setRetryCount(attempt);
        } else {
          setRetryCount(0);
          toast({
            title: "Auto-save failed",
            description: error.message?.includes('auth') 
              ? "Please log in again to save changes."
              : "Changes saved locally. Check your connection.",
            variant: "destructive",
            action: error.message?.includes('auth') ? (
              <Button variant="outline" size="sm" onClick={refreshSession}>
                Login Again
              </Button>
            ) : undefined
          });
        }
      } finally {
        setIsSaving(false);
      }
    },
    [user, isSaving, toast, refreshSession, isOnline]
  );


  // Debounced auto-save
  useEffect(() => {
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
    await autoSave(planData, true);
    if (saveStatus === 'saved') {
      toast({
        title: "Plan saved",
        description: "Your plan has been saved successfully.",
      });
    }
  };

  const forceSync = async () => {
    if (!isOnline) {
      toast({
        title: "No internet connection",
        description: "Please check your connection and try again.",
        variant: "destructive",
      });
      return;
    }
    await autoSave(planData, true);
  };

  const getSaveStatusColor = () => {
    switch (saveStatus) {
      case 'saved': return 'default';
      case 'saving': case 'syncing': return 'secondary';
      case 'local': return 'outline';
      case 'failed': return 'destructive';
      default: return 'default';
    }
  };

  const getSaveStatusText = () => {
    switch (saveStatus) {
      case 'saved': return 'All changes saved';
      case 'saving': return 'Saving...';
      case 'syncing': return 'Syncing...';
      case 'local': return 'Saved locally';
      case 'failed': return retryCount > 0 ? `Retrying (${retryCount}/3)` : 'Save failed';
      default: return 'Unknown status';
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
            {/* Online Status */}
            <div className="flex items-center gap-1">
              {isOnline ? (
                <Wifi className="h-4 w-4 text-green-500" />
              ) : (
                <WifiOff className="h-4 w-4 text-red-500" />
              )}
            </div>

            {/* Save Status */}
            <Badge variant={getSaveStatusColor()} className={
              saveStatus === 'saving' || saveStatus === 'syncing' ? 'animate-pulse' : ''
            }>
              {getSaveStatusText()}
            </Badge>

            {/* Sync Button - show when there are local changes or failed saves */}
            {(saveStatus === 'local' || saveStatus === 'failed') && (
              <Button
                onClick={forceSync}
                disabled={!isOnline || isSaving}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${isSaving ? 'animate-spin' : ''}`} />
                Sync Now
              </Button>
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