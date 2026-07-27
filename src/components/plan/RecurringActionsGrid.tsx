import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, RefreshCw, Trash2 } from 'lucide-react';
import { api, convex } from '@/lib/convex';
import type { Id } from '../../../convex/_generated/dataModel';
import { RecurringActionCard, RecurringAction } from './RecurringActionCard';
import { AddActionDialog } from './AddActionDialog';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface RecurringActionsGridProps {
  onPostClick?: (postId: string) => void;
}

export const RecurringActionsGrid: React.FC<RecurringActionsGridProps> = ({ onPostClick }) => {
  const [actions, setActions] = useState<RecurringAction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pendingActionType, setPendingActionType] = useState<'monthly' | 'weekly' | 'quarterly' | null>(null);
  const [showDeleteAllDialog, setShowDeleteAllDialog] = useState(false);

  const loadActions = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await convex.query(api.plan.listActions, {});
      setActions(data as unknown as RecurringAction[]);
    } catch (error) {
      console.error('Error loading actions:', error);
      toast.error('Chyba při načítání akcí');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadActions();
  }, [loadActions]);

  const showAddDialog = (actionType: 'monthly' | 'weekly' | 'quarterly') => {
    setPendingActionType(actionType);
    setDialogOpen(true);
  };

  const addAction = async (title: string, frequency: string) => {
    if (!pendingActionType) return;

    try {
      const created = await convex.mutation(api.plan.createAction, {
        action_type: pendingActionType,
        title,
        frequency,
        description: '',
        data: {},
        order_index: 0,
      });

      setActions([...actions, ...(created ? [created as unknown as RecurringAction] : [])]);
      toast.success('Akce vytvořena');
    } catch (error) {
      console.error('Error creating action:', error);
      toast.error('Chyba při vytváření akce');
    }
  };

  const updateAction = async (id: string, updates: Partial<RecurringAction>) => {
    try {
      const { id: _ignored, created_at, updated_at, user_id, ...values } = updates as Record<string, unknown>;

      await convex.mutation(api.plan.updateAction, {
        id: id as Id<'recurring_actions'>,
        values,
      });

      setActions(actions.map(a => a.id === id ? { ...a, ...updates } : a));
      toast.success('Akce aktualizována');
    } catch (error) {
      console.error('Error updating action:', error);
      toast.error('Chyba při aktualizaci akce');
    }
  };

  const deleteAction = async (id: string) => {
    try {
      await convex.mutation(api.plan.removeAction, {
        id: id as Id<'recurring_actions'>,
      });

      setActions(actions.filter(a => a.id !== id));
      toast.success('Akce smazána');
    } catch (error) {
      console.error('Error deleting action:', error);
      toast.error('Chyba při mazání akce');
    }
  };

  const deleteAllActions = async () => {
    try {
      const actionIds = actions.map((a) => a.id as Id<'recurring_actions'>);
      await convex.mutation(api.plan.removeActions, { ids: actionIds });

      setActions([]);
      toast.success('Všechny akce byly smazány');
      setShowDeleteAllDialog(false);
    } catch (error) {
      console.error('Error deleting all actions:', error);
      toast.error('Chyba při mazání akcí');
    }
  };

  const getActionsByType = (type: 'monthly' | 'weekly' | 'quarterly') => {
    return actions.filter(a => a.action_type === type);
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

  const monthlyActions = getActionsByType('monthly');
  const weeklyActions = getActionsByType('weekly');
  const quarterlyActions = getActionsByType('quarterly');

  return (
    <>
      <AddActionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        actionType={pendingActionType || 'monthly'}
        onConfirm={(title, frequency) => {
          if (pendingActionType) {
            addAction(title, frequency);
          }
        }}
      />

      <AlertDialog open={showDeleteAllDialog} onOpenChange={setShowDeleteAllDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Smazat všechny akce?</AlertDialogTitle>
            <AlertDialogDescription>
              Opravdu chcete smazat všechny akce? Tato akce je nevratná.
              Všechny posty spojené s těmito akcemi zůstanou zachovány.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Zrušit</AlertDialogCancel>
            <AlertDialogAction onClick={deleteAllActions} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Smazat vše
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="flex-1 p-6 overflow-auto">
        <div className="max-w-[1800px] mx-auto space-y-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Plán pravidelných akcí</h1>
              <p className="text-muted-foreground">
                Organizujte měsíční, týdenní a čtvrtletní kampaně
              </p>
            </div>

            {actions.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDeleteAllDialog(true)}
                className="flex items-center gap-2 text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
                Smazat všechny
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-purple-900">
                  📅 Měsíční akce
                </h2>
                <Button
                  size="sm"
                  onClick={() => showAddDialog('monthly')}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg space-y-3 min-h-[400px]">
                {monthlyActions.map(action => (
                  <RecurringActionCard
                    key={action.id}
                    action={action}
                    onUpdate={(updates) => updateAction(action.id, updates)}
                    onDelete={() => deleteAction(action.id)}
                    onRefresh={loadActions}
                    onPostClick={onPostClick}
                  />
                ))}
                {monthlyActions.length === 0 && (
                  <Card className="border-dashed bg-white/50">
                    <CardContent className="py-8 text-center text-muted-foreground text-sm">
                      Žádné měsíční akce
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-blue-900">
                  📱 Týdenní akce
                </h2>
                <Button
                  size="sm"
                  onClick={() => showAddDialog('weekly')}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="bg-blue-50 p-4 rounded-lg space-y-3 min-h-[400px]">
                {weeklyActions.map(action => (
                  <RecurringActionCard
                    key={action.id}
                    action={action}
                    onUpdate={(updates) => updateAction(action.id, updates)}
                    onDelete={() => deleteAction(action.id)}
                    onRefresh={loadActions}
                    onPostClick={onPostClick}
                  />
                ))}
                {weeklyActions.length === 0 && (
                  <Card className="border-dashed bg-white/50">
                    <CardContent className="py-8 text-center text-muted-foreground text-sm">
                      Žádné týdenní akce
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-orange-900">
                  🎁 Čtvrtletní akce
                </h2>
                <Button
                  size="sm"
                  onClick={() => showAddDialog('quarterly')}
                  className="bg-orange-600 hover:bg-orange-700"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="bg-orange-50 p-4 rounded-lg space-y-3 min-h-[400px]">
                {quarterlyActions.map(action => (
                  <RecurringActionCard
                    key={action.id}
                    action={action}
                    onUpdate={(updates) => updateAction(action.id, updates)}
                    onDelete={() => deleteAction(action.id)}
                    onRefresh={loadActions}
                    onPostClick={onPostClick}
                  />
                ))}
                {quarterlyActions.length === 0 && (
                  <Card className="border-dashed bg-white/50">
                    <CardContent className="py-8 text-center text-muted-foreground text-sm">
                      Žádné čtvrtletní akce
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
