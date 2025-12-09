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
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pendingActionType, setPendingActionType] = useState<'monthly' | 'weekly' | 'quarterly' | null>(null);
  const [pendingMonth, setPendingMonth] = useState<string | null>(null);

  const loadActions = useCallback(async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const monthsOfYear = MONTHS.map(month => `${month} ${currentYear}`);

      const { data, error } = await supabase
        .from('recurring_actions')
        .select('*')
        .eq('user_id', user.id)
        .in('month', monthsOfYear)
        .order('order_index', { ascending: true });

      if (error) throw error;

      setActions(data || []);
    } catch (error) {
      console.error('Error loading actions:', error);
      toast.error('Chyba při načítání akcí');
    } finally {
      setIsLoading(false);
    }
  }, [user, currentYear]);

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

  const showAddDialog = (actionType: 'monthly' | 'weekly' | 'quarterly', month: string) => {
    setPendingActionType(actionType);
    setPendingMonth(month);
    setDialogOpen(true);
  };

  const addAction = async (actionType: 'monthly' | 'weekly' | 'quarterly', repeatFor12Months: boolean) => {
    if (!user || !pendingMonth) return;

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
      let currentMonth = pendingMonth;
      const groupId = repeatFor12Months ? crypto.randomUUID() : null;

      for (let i = 0; i < monthsToCreate; i++) {
        const actionTitle = repeatFor12Months
          ? `${newAction.title} - ${currentMonth}`
          : newAction.title;

        actionsToInsert.push({
          user_id: user.id,
          action_type: actionType,
          title: actionTitle,
          subtitle: newAction.subtitle,
          description: newAction.description,
          data: newAction.data,
          month: currentMonth,
          order_index: 0,
          group_id: groupId,
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

      setActions([...actions, ...(data || [])]);

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
      const currentAction = actions.find(a => a.id === id);

      if (updates.title && currentAction?.group_id) {
        const { data: groupedActions, error: fetchError } = await supabase
          .from('recurring_actions')
          .select('id, month')
          .eq('group_id', currentAction.group_id);

        if (fetchError) throw fetchError;

        const baseTitleMatch = currentAction.title.match(/^(.+?)(?:\s*-\s*[A-Za-zÁ-Žá-ž]+\s+\d{4})?$/);
        const baseTitle = baseTitleMatch ? baseTitleMatch[1].trim() : currentAction.title;

        const newBaseTitle = updates.title.replace(/\s*-\s*[A-Za-zÁ-Žá-ž]+\s+\d{4}$/, '').trim();

        for (const action of groupedActions || []) {
          const newTitle = `${newBaseTitle} - ${action.month}`;
          const { error: updateError } = await supabase
            .from('recurring_actions')
            .update({ title: newTitle, updated_at: new Date().toISOString() })
            .eq('id', action.id);

          if (updateError) throw updateError;
        }

        await loadActions();
        toast.success('Název aktualizován pro všechny měsíce');
      } else {
        const { error } = await supabase
          .from('recurring_actions')
          .update({ ...updates, updated_at: new Date().toISOString() })
          .eq('id', id);

        if (error) throw error;

        setActions(actions.map(a => a.id === id ? { ...a, ...updates } : a));
        toast.success('Akce aktualizována');
      }
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

  const getActionsByMonth = (month: string) => {
    return actions.filter(a => a.month === month);
  };

  const getActionsByMonthAndType = (month: string, type: 'monthly' | 'weekly' | 'quarterly') => {
    return actions.filter(a => a.month === month && a.action_type === type);
  };

  const changeYear = (direction: 'prev' | 'next') => {
    setCurrentYear(prev => direction === 'next' ? prev + 1 : prev - 1);
  };

  const renderMonthSection = (monthName: string, monthIndex: number) => {
    const monthStr = `${monthName} ${currentYear}`;
    const monthActions = getActionsByMonth(monthStr);
    const monthlyActions = getActionsByMonthAndType(monthStr, 'monthly');
    const weeklyActions = getActionsByMonthAndType(monthStr, 'weekly');
    const quarterlyActions = getActionsByMonthAndType(monthStr, 'quarterly');

    return (
      <div key={monthStr} className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold text-foreground">{monthName}</h2>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => showAddDialog('monthly', monthStr)}
              className="flex items-center gap-1"
            >
              <Calendar1 className="h-4 w-4 text-purple-600" />
              <Plus className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => showAddDialog('weekly', monthStr)}
              className="flex items-center gap-1"
            >
              <CalendarDays className="h-4 w-4 text-blue-600" />
              <Plus className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => showAddDialog('quarterly', monthStr)}
              className="flex items-center gap-1"
            >
              <CalendarRange className="h-4 w-4 text-orange-600" />
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="space-y-4">
            {monthlyActions.map(action => (
              <RecurringActionCard
                key={action.id}
                action={action}
                onUpdate={(updates) => updateAction(action.id, updates)}
                onDelete={() => deleteAction(action.id)}
              />
            ))}
            {monthlyActions.length === 0 && (
              <Card className="border-dashed">
                <CardContent className="py-8 text-center text-muted-foreground text-sm">
                  Žádné měsíční akce
                </CardContent>
              </Card>
            )}
          </div>

          <div className="space-y-4">
            {weeklyActions.map(action => (
              <RecurringActionCard
                key={action.id}
                action={action}
                onUpdate={(updates) => updateAction(action.id, updates)}
                onDelete={() => deleteAction(action.id)}
              />
            ))}
            {weeklyActions.length === 0 && (
              <Card className="border-dashed">
                <CardContent className="py-8 text-center text-muted-foreground text-sm">
                  Žádné týdenní akce
                </CardContent>
              </Card>
            )}
          </div>

          <div className="space-y-4">
            {quarterlyActions.map(action => (
              <RecurringActionCard
                key={action.id}
                action={action}
                onUpdate={(updates) => updateAction(action.id, updates)}
                onDelete={() => deleteAction(action.id)}
              />
            ))}
            {quarterlyActions.length === 0 && (
              <Card className="border-dashed">
                <CardContent className="py-8 text-center text-muted-foreground text-sm">
                  Žádné čtvrtletní akce
                </CardContent>
              </Card>
            )}
          </div>
        </div>
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
        <div className="max-w-[1800px] mx-auto space-y-8">
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
                onClick={() => changeYear('prev')}
                className="flex items-center gap-1"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              <div className="flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-lg">
                <Calendar className="h-5 w-5 text-primary" />
                <span className="font-semibold text-lg">{currentYear}</span>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => changeYear('next')}
                className="flex items-center gap-1"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="space-y-12">
            {MONTHS.map((month, index) => renderMonthSection(month, index))}
          </div>
        </div>
      </div>
    </>
  );
};
