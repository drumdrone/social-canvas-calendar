import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Trash2, Edit2, Check, X, Circle, Calendar, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';

export interface RecurringAction {
  id: string;
  user_id: string;
  action_type: 'monthly' | 'weekly' | 'quarterly';
  title: string;
  description: string;
  frequency: string;
  data: Record<string, any>;
  color: string;
  order_index: number;
  created_at: string;
  updated_at: string;
}

interface RecurringActionCardProps {
  action: RecurringAction;
  onUpdate: (updates: Partial<RecurringAction>) => void;
  onDelete: () => void;
  onRefresh: () => void;
}

interface Post {
  id: string;
  title: string;
  scheduled_date: string;
}

const FREQUENCY_OPTIONS = {
  monthly: [
    { value: '1x', label: '1x měsíčně' },
    { value: '2x', label: '2x měsíčně' },
    { value: '3x', label: '3x měsíčně' },
    { value: '4x', label: '4x měsíčně' },
  ],
  weekly: [
    { value: '1x', label: '1x týdně' },
    { value: '2x', label: '2x týdně' },
    { value: '3x', label: '3x týdně' },
    { value: '4x', label: '4x týdně' },
  ],
  quarterly: [
    { value: '1x', label: '1x čtvrtletně' },
    { value: '2x', label: '2x čtvrtletně' },
    { value: '4x', label: '4x čtvrtletně' },
  ],
};

export const RecurringActionCard: React.FC<RecurringActionCardProps> = ({
  action,
  onUpdate,
  onDelete,
  onRefresh,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [posts, setPosts] = useState<Post[]>([]);
  const [editData, setEditData] = useState({
    title: action.title,
    frequency: action.frequency || '1x',
  });

  useEffect(() => {
    loadPosts();
  }, [action.id]);

  const loadPosts = async () => {
    try {
      const { data, error } = await supabase
        .from('social_media_posts')
        .select('id, title, scheduled_date')
        .eq('recurring_action_id', action.id)
        .not('scheduled_date', 'is', null)
        .order('scheduled_date', { ascending: true });

      if (error) throw error;
      setPosts(data || []);
    } catch (error) {
      console.error('Error loading posts:', error);
    }
  };

  const handleSave = () => {
    onUpdate({
      title: editData.title.trim(),
      frequency: editData.frequency,
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditData({
      title: action.title,
      frequency: action.frequency || '1x',
    });
    setIsEditing(false);
  };

  const getFrequencyLabel = () => {
    const option = FREQUENCY_OPTIONS[action.action_type].find(
      (opt) => opt.value === action.frequency
    );
    return option?.label || action.frequency;
  };

  const formatPostDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return format(date, 'd.M.yyyy', { locale: cs });
    } catch {
      return dateString;
    }
  };

  if (isEditing) {
    return (
      <Card className="bg-white">
        <CardContent className="p-4 space-y-3">
          <div className="space-y-2">
            <Label htmlFor={`title-${action.id}`}>Název</Label>
            <Input
              id={`title-${action.id}`}
              value={editData.title}
              onChange={(e) => setEditData({ ...editData, title: e.target.value })}
              placeholder="Název akce"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor={`frequency-${action.id}`}>Frekvence</Label>
            <Select
              value={editData.frequency}
              onValueChange={(value) => setEditData({ ...editData, frequency: value })}
            >
              <SelectTrigger id={`frequency-${action.id}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FREQUENCY_OPTIONS[action.action_type].map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <Button size="sm" onClick={handleSave} disabled={!editData.title.trim()}>
              <Check className="h-4 w-4 mr-1" />
              Uložit
            </Button>
            <Button size="sm" variant="ghost" onClick={handleCancel}>
              <X className="h-4 w-4 mr-1" />
              Zrušit
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Circle
                className={`h-3 w-3 flex-shrink-0 ${
                  posts.length > 0
                    ? 'fill-green-500 text-green-500'
                    : 'fill-gray-300 text-gray-300'
                }`}
              />
              <h3 className="font-semibold text-sm truncate">{action.title}</h3>
            </div>
            <Badge variant="outline" className="text-xs">
              {getFrequencyLabel()}
            </Badge>
          </div>

          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsEditing(true)}
              className="h-7 w-7 p-0"
            >
              <Edit2 className="h-3 w-3" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={onDelete}
              className="h-7 w-7 p-0 text-destructive hover:text-destructive"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {posts.length > 0 && (
          <div className="mt-3 pt-3 border-t">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Calendar className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground font-medium">
                  Příspěvky ({posts.length})
                </span>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setIsExpanded(!isExpanded)}
                className="h-6 w-6 p-0"
              >
                {isExpanded ? (
                  <ChevronUp className="h-3 w-3" />
                ) : (
                  <ChevronDown className="h-3 w-3" />
                )}
              </Button>
            </div>

            {isExpanded && (
              <div className="space-y-1.5 mt-2">
                {posts.map((post) => (
                  <div
                    key={post.id}
                    className="flex items-center gap-2 text-xs p-2 rounded bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <span className="font-medium text-muted-foreground min-w-[70px]">
                      {formatPostDate(post.scheduled_date)}
                    </span>
                    <span className="truncate flex-1">{post.title}</span>
                  </div>
                ))}
              </div>
            )}

            {!isExpanded && posts.length > 0 && (
              <div className="text-xs text-muted-foreground mt-1">
                {formatPostDate(posts[0].scheduled_date)} - {posts[0].title}
                {posts.length > 1 && (
                  <span className="ml-1">
                    (+{posts.length - 1} další)
                  </span>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
