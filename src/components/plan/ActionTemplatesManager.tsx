import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus } from "lucide-react";
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
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Šablony akcí</CardTitle>
            <CardDescription>
              Vytvořte šablony pro opakující se akce. Změny v šabloně se automaticky promítnou do všech instancí.
            </CardDescription>
          </div>
          <Button onClick={() => setIsDialogOpen(true)} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Nová šablona
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Načítání...</div>
        ) : templates.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Zatím nemáte žádné šablony. Vytvořte první!
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {templates.map((template) => (
              <ActionTemplateCard
                key={template.id}
                template={template}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onGenerateInstances={handleGenerateInstances}
              />
            ))}
          </div>
        )}
      </CardContent>

      <ActionTemplateDialog
        open={isDialogOpen}
        onOpenChange={handleCloseDialog}
        template={editingTemplate}
      />
    </Card>
  );
}
