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
    <Card className="border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="px-4 pt-4 pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base font-medium">{template.title}</CardTitle>
            {template.subtitle && (
              <CardDescription className="mt-1 text-sm">{template.subtitle}</CardDescription>
            )}
          </div>
          <Badge variant={template.status === "active" ? "default" : "secondary"} className="font-normal">
            {template.status === "active" ? "Aktivní" : "Neaktivní"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-3">
        {template.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">{template.description}</p>
        )}

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {template.times_per_period}x za období
        </div>

        <div className="flex gap-2 pt-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit(template)}
            className="flex-1 text-muted-foreground hover:text-foreground"
          >
            <Edit className="h-3.5 w-3.5 mr-1" />
            Upravit
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onGenerateInstances(template.id)}
            className="flex-1 text-muted-foreground hover:text-foreground"
          >
            <RefreshCw className="h-3.5 w-3.5 mr-1" />
            Generovat
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(template.id)}
            className="text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
