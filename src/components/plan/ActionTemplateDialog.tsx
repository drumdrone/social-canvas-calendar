import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

interface ActionTemplate {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  frequency: string;
  times_per_period: number;
  color: string;
  status: string;
}

interface ActionTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template?: ActionTemplate | null;
}

export function ActionTemplateDialog({ open, onOpenChange, template }: ActionTemplateDialogProps) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    title: "",
    subtitle: "",
    description: "",
    frequency: "monthly",
    times_per_period: 1,
    color: "#3b82f6",
    status: "active",
  });

  useEffect(() => {
    if (template) {
      setFormData({
        title: template.title,
        subtitle: template.subtitle,
        description: template.description,
        frequency: template.frequency,
        times_per_period: template.times_per_period,
        color: template.color,
        status: template.status,
      });
    } else {
      setFormData({
        title: "",
        subtitle: "",
        description: "",
        frequency: "monthly",
        times_per_period: 1,
        color: "#3b82f6",
        status: "active",
      });
    }
  }, [template, open]);

  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Nepřihlášen");

      if (template) {
        const { error } = await supabase
          .from("action_templates")
          .update({ ...data, updated_at: new Date().toISOString() })
          .eq("id", template.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("action_templates")
          .insert({ ...data, user_id: user.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["action-templates"] });
      toast.success(template ? "Šablona aktualizována" : "Šablona vytvořena");
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error("Chyba: " + error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{template ? "Upravit šablonu" : "Nová šablona akce"}</DialogTitle>
          <DialogDescription>
            Vytvořte šablonu která se bude automaticky opakovat podle nastavení.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="title">Název *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
                placeholder="např. Recept týdne"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="subtitle">Podtitul</Label>
              <Input
                id="subtitle"
                value={formData.subtitle}
                onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                placeholder="např. Instagram Story"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Popis</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Detailní popis akce..."
              rows={3}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="frequency">Frekvence *</Label>
              <Select
                value={formData.frequency}
                onValueChange={(value) => setFormData({ ...formData, frequency: value })}
              >
                <SelectTrigger id="frequency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Týdenní</SelectItem>
                  <SelectItem value="monthly">Měsíční</SelectItem>
                  <SelectItem value="quarterly">Čtvrtletní</SelectItem>
                  <SelectItem value="yearly">Roční</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="times_per_period">Kolikrát za období *</Label>
              <Input
                id="times_per_period"
                type="number"
                min="1"
                value={formData.times_per_period}
                onChange={(e) =>
                  setFormData({ ...formData, times_per_period: parseInt(e.target.value) || 1 })
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="color">Barva</Label>
              <Input
                id="color"
                type="color"
                value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select
              value={formData.status}
              onValueChange={(value) => setFormData({ ...formData, status: value })}
            >
              <SelectTrigger id="status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Aktivní</SelectItem>
                <SelectItem value="inactive">Neaktivní</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Zrušit
            </Button>
            <Button type="submit" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? "Ukládám..." : template ? "Uložit změny" : "Vytvořit"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
