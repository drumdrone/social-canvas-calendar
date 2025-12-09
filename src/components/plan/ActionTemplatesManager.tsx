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
    icon: React.ReactNode,
    color: string
  ) => {
    const columnTemplates = getTemplatesByFrequency(frequency);

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
                onClick={() => handleAddTemplate(frequency)}
                className="flex items-center gap-1"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 max-h-[calc(100vh-250px)] overflow-y-auto">
            {columnTemplates.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
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
          <span>Načítání šablon...</span>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="max-w-[1800px] mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Šablony akcí</h1>
            <p className="text-muted-foreground">
              Vytvořte šablony pro měsíční, týdenní a čtvrtletní kampaně
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {renderColumn(
            'monthly',
            'Měsíční šablony',
            <Calendar1 className="h-5 w-5 text-purple-600" />,
            'border-t-purple-400'
          )}
          {renderColumn(
            'weekly',
            'Týdenní šablony',
            <CalendarDays className="h-5 w-5 text-blue-600" />,
            'border-t-blue-400'
          )}
          {renderColumn(
            'quarterly',
            'Čtvrtletní šablony',
            <CalendarRange className="h-5 w-5 text-orange-600" />,
            'border-t-orange-400'
          )}
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
