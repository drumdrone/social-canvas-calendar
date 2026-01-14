import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Calendar1, CalendarDays, CalendarRange, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { ActionTemplateDialog } from "./ActionTemplateDialog";
import { ActionTemplateCard } from "./ActionTemplateCard";

interface ActionTemplate {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  frequency: string;
  times_per_period: number;
  color: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export function ActionTemplatesManager() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ActionTemplate | null>(null);
  const [pendingFrequency, setPendingFrequency] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["action-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("action_templates")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as ActionTemplate[];
    },
  });

  const createInstancesMutation = useMutation({
    mutationFn: async (templateId: string) => {
      const { data, error } = await supabase.rpc("generate_instances_from_template", {
        p_template_id: templateId,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recurring-actions"] });
      toast.success("Instance vytvořeny!");
    },
    onError: (error) => {
      toast.error("Chyba při vytváření instancí: " + error.message);
    },
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("action_templates").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["action-templates"] });
      toast.success("Šablona smazána");
    },
    onError: (error) => {
      toast.error("Chyba při mazání: " + error.message);
    },
  });

  const handleEdit = (template: ActionTemplate) => {
    setEditingTemplate(template);
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Opravdu smazat tuto šablonu? Existující instance zůstanou zachovány.")) {
      deleteTemplateMutation.mutate(id);
    }
  };

  const handleGenerateInstances = (templateId: string) => {
    createInstancesMutation.mutate(templateId);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingTemplate(null);
    setPendingFrequency(null);
  };

  const handleAddTemplate = (frequency: string) => {
    setPendingFrequency(frequency);
    setIsDialogOpen(true);
  };

  const getTemplatesByFrequency = (frequency: string) => {
    return templates.filter((t) => t.frequency === frequency);
  };

  const renderColumn = (
    frequency: string,
    title: string,
    icon: React.ReactNode
  ) => {
    const columnTemplates = getTemplatesByFrequency(frequency);

    return (
      <div className="flex-1 min-w-0 space-y-3">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            {title} {columnTemplates.length > 0 && `(${columnTemplates.length})`}
          </h3>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleAddTemplate(frequency)}
            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>
        <div className="space-y-3">
          {columnTemplates.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm border border-dashed border-gray-200 rounded-lg">
              Žádné šablony
            </div>
          ) : (
            columnTemplates.map((template) => (
              <ActionTemplateCard
                key={template.id}
                template={template}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onGenerateInstances={handleGenerateInstances}
              />
            ))
          )}
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex items-center gap-2">
          <RefreshCw className="h-4 w-4 animate-spin" />
          <span>Načítání šablon...</span>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex-1 overflow-auto bg-gray-50">
        <div className="max-w-[1600px] mx-auto px-8 py-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-semibold text-foreground mb-1">Šablony akcí</h1>
              <p className="text-sm text-muted-foreground">
                Vytvořte šablony pro měsíční, týdenní a čtvrtletní kampaně
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {renderColumn(
              'monthly',
              'Měsíční šablony',
              <Calendar1 className="h-4 w-4" />
            )}
            {renderColumn(
              'weekly',
              'Týdenní šablony',
              <CalendarDays className="h-4 w-4" />
            )}
            {renderColumn(
              'quarterly',
              'Čtvrtletní šablony',
              <CalendarRange className="h-4 w-4" />
            )}
          </div>
        </div>
      </div>

      <ActionTemplateDialog
        open={isDialogOpen}
        onOpenChange={handleCloseDialog}
        template={editingTemplate}
        defaultFrequency={pendingFrequency}
      />
    </>
  );
}
