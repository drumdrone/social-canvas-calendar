import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash2, RefreshCw } from "lucide-react";

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

interface ActionTemplateCardProps {
  template: ActionTemplate;
  onEdit: (template: ActionTemplate) => void;
  onDelete: (id: string) => void;
  onGenerateInstances: (id: string) => void;
}

export function ActionTemplateCard({
  template,
  onEdit,
  onDelete,
  onGenerateInstances,
}: ActionTemplateCardProps) {
  return (
    <Card className="relative overflow-hidden">
      <div
        className="absolute top-0 left-0 w-1 h-full"
        style={{ backgroundColor: template.color }}
      />
      <CardHeader className="pl-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg">{template.title}</CardTitle>
            {template.subtitle && (
              <CardDescription className="mt-1">{template.subtitle}</CardDescription>
            )}
          </div>
          <Badge variant={template.status === "active" ? "default" : "secondary"}>
            {template.status === "active" ? "Aktivní" : "Neaktivní"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {template.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">{template.description}</p>
        )}

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {template.times_per_period}x za období
        </div>

        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onEdit(template)}
            className="flex-1"
          >
            <Edit className="h-3.5 w-3.5 mr-1" />
            Upravit
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onGenerateInstances(template.id)}
            className="flex-1"
          >
            <RefreshCw className="h-3.5 w-3.5 mr-1" />
            Generovat
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onDelete(template.id)}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
