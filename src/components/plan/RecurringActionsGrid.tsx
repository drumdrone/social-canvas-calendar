import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Calendar, RefreshCw, Calendar1, CalendarDays, CalendarRange, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { RecurringActionCard, RecurringAction } from './RecurringActionCard';
import { AddActionDialog } from './AddActionDialog';
import { toast } from 'sonner';

const MONTHS = [
  'Leden', 'Únor', 'Březen', 'Duben', 'Květen', 'Červen',
  'Červenec', 'Srpen', 'Září', 'Říjen', 'Listopad', 'Prosinec'
];

export const RecurringActionsGrid: React.FC = () => {
  const { user } = useAuth();
  const [actions, setActions] = useState<RecurringAction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${MONTHS[now.getMonth()]} ${now.getFullYear()}`;
  });
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pendingActionType, setPendingActionType] = useState<'monthly' | 'weekly' | 'quarterly' | null>(null);

  const loadActions = useCallback(async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('recurring_actions')
        .select('*')
        .eq('user_id', user.id)
        .eq('month', selectedMonth)
        .order('order_index', { ascending: true });

      if (error) throw error;

      setActions(data || []);
    } catch (error) {
      console.error('Error loading actions:', error);
      toast.error('Chyba při načítání akcí');
    } finally {
      setIsLoading(false);
    }
  }, [user, selectedMonth]);

  useEffect(() => {
    loadActions();
  }, [loadActions]);

  const getNextMonth = (monthStr: string): string => {
    const [monthName, yearStr] = monthStr.split(' ');
    const monthIndex = MONTHS.indexOf(monthName);
    const year = parseInt(yearStr);

    const newMonthIndex = (monthIndex + 1) % 12;
    const newYear = newMonthIndex === 0 ? year + 1 : year;

    return `${MONTHS[newMonthIndex]} ${newYear}`;
  };

  const showAddDialog = (actionType: 'monthly' | 'weekly' | 'quarterly') => {
    setPendingActionType(actionType);
    setDialogOpen(true);
  };

  const addAction = async (actionType: 'monthly' | 'weekly' | 'quarterly', repeatFor12Months: boolean) => {
    if (!user) return;

    const defaultData = {
      monthly: {
        title: 'Nová měsíční akce',
        subtitle: '',
        description: '',
        data: { theme: '', products: '', channels: '' }
      },
      weekly: {
        title: 'Nové týdenní posty',
        subtitle: '',
        description: '',
        data: { weeks_count: 4, posts: [] }
      },
      quarterly: {
        title: 'Nová čtvrtletní kampaň',
        subtitle: '',
        description: '',
        data: { hashtag: '', mechanics: '', prize: '', platforms: '', announcement_date: '' }
      }
    };

    const newAction = defaultData[actionType];
    const monthsToCreate = repeatFor12Months ? 12 : 1;

    try {
      const actionsToInsert = [];
      let currentMonth = selectedMonth;

      for (let i = 0; i < monthsToCreate; i++) {
        actionsToInsert.push({
          user_id: user.id,
          action_type: actionType,
          title: newAction.title,
          subtitle: newAction.subtitle,
          description: newAction.description,
          data: newAction.data,
          month: currentMonth,
          order_index: 0,
        });

        if (i < monthsToCreate - 1) {
          currentMonth = getNextMonth(currentMonth);
        }
      }

      const { data, error } = await supabase
        .from('recurring_actions')
        .insert(actionsToInsert)
        .select();

      if (error) throw error;

      const newActionsInCurrentMonth = data?.filter(a => a.month === selectedMonth) || [];
      setActions([...actions, ...newActionsInCurrentMonth]);

      if (repeatFor12Months) {
        toast.success(`Vytvořeno ${monthsToCreate} akcí pro následujících 12 měsíců`);
      } else {
        toast.success('Akce vytvořena');
      }
    } catch (error) {
      console.error('Error creating action:', error);
      toast.error('Chyba při vytváření akce');
    }
  };

  const updateAction = async (id: string, updates: Partial<RecurringAction>) => {
    try {
      const { error } = await supabase
        .from('recurring_actions')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;

      setActions(actions.map(a => a.id === id ? { ...a, ...updates } : a));
      toast.success('Akce aktualizována');
    } catch (error) {
      console.error('Error updating action:', error);
      toast.error('Chyba při aktualizaci akce');
    }
  };

  const deleteAction = async (id: string) => {
    try {
      const { error } = await supabase
        .from('recurring_actions')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setActions(actions.filter(a => a.id !== id));
      toast.success('Akce smazána');
    } catch (error) {
      console.error('Error deleting action:', error);
      toast.error('Chyba při mazání akce');
    }
  };

  const getActionsByType = (type: 'monthly' | 'weekly' | 'quarterly') => {
    return actions.filter(a => a.action_type === type);
  };

  const changeMonth = (direction: 'prev' | 'next') => {
    const [monthName, yearStr] = selectedMonth.split(' ');
    const monthIndex = MONTHS.indexOf(monthName);
    const year = parseInt(yearStr);

    let newMonthIndex = monthIndex;
    let newYear = year;

    if (direction === 'next') {
      newMonthIndex = (monthIndex + 1) % 12;
      if (newMonthIndex === 0) newYear++;
    } else {
      newMonthIndex = (monthIndex - 1 + 12) % 12;
      if (newMonthIndex === 11) newYear--;
    }

    setSelectedMonth(`${MONTHS[newMonthIndex]} ${newYear}`);
  };

  const renderColumn = (
    type: 'monthly' | 'weekly' | 'quarterly',
    title: string,
    icon: React.ReactNode,
    color: string
  ) => {
    const columnActions = getActionsByType(type);

    return (
      <div className="flex-1 min-w-0">
        <Card className={`h-full border-t-4 ${color}`}>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {icon}
                <CardTitle className="text-lg">{title}</CardTitle>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => showAddDialog(type)}
                className="flex items-center gap-1"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 max-h-[calc(100vh-250px)] overflow-y-auto">
            {columnActions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                Žádné akce
              </div>
            ) : (
              columnActions.map(action => (
                <RecurringActionCard
                  key={action.id}
                  action={action}
                  onUpdate={(updates) => updateAction(action.id, updates)}
                  onDelete={() => deleteAction(action.id)}
                />
              ))
            )}
          </CardContent>
        </Card>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex items-center gap-2">
          <RefreshCw className="h-4 w-4 animate-spin" />
          <span>Načítání akcí...</span>
        </div>
      </div>
    );
  }

  return (
    <>
      <AddActionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        actionType={pendingActionType || 'monthly'}
        onConfirm={(repeatFor12Months) => {
          if (pendingActionType) {
            addAction(pendingActionType, repeatFor12Months);
          }
        }}
      />

      <div className="flex-1 p-6 overflow-auto">
        <div className="max-w-[1800px] mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Plán pravidelných akcí</h1>
            <p className="text-muted-foreground">
              Organizujte měsíční, týdenní a čtvrtletní kampaně
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => changeMonth('prev')}
              className="flex items-center gap-1"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <div className="flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-lg">
              <Calendar className="h-5 w-5 text-primary" />
              <span className="font-semibold text-lg">{selectedMonth}</span>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => changeMonth('next')}
              className="flex items-center gap-1"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* 3 Column Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {renderColumn(
            'monthly',
            'Měsíční akce',
            <Calendar1 className="h-5 w-5 text-purple-600" />,
            'border-t-purple-400'
          )}
          {renderColumn(
            'weekly',
            'Týdenní akce',
            <CalendarDays className="h-5 w-5 text-blue-600" />,
            'border-t-blue-400'
          )}
          {renderColumn(
            'quarterly',
            'Čtvrtletní akce',
            <CalendarRange className="h-5 w-5 text-orange-600" />,
            'border-t-orange-400'
          )}
        </div>
      </div>
    </div>
    </>
  );
};
