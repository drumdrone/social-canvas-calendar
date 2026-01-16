import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Trash2, Edit2, Check, X, Circle, Calendar, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, startOfQuarter, endOfQuarter, addMonths, addWeeks } from 'date-fns';
import { cs } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';

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
  status: string;
}

interface PeriodStatus {
  label: string;
  status: 'none' | 'draft' | 'in-progress' | 'published';
  requiredCount: number;
  actualCount: number;
  publishedCount: number;
  inProgressCount: number;
  weeklyBreakdown?: Array<{
    publishedCount: number;
    inProgressCount: number;
    requiredCount: number;
  }>;
}

interface StatusConfig {
  name: string;
  color: string;
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
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [posts, setPosts] = useState<Post[]>([]);
  const [periodStatuses, setPeriodStatuses] = useState<PeriodStatus[]>([]);
  const [statusConfigs, setStatusConfigs] = useState<StatusConfig[]>([]);
  const [editData, setEditData] = useState({
    title: action.title,
    frequency: action.frequency || '1x',
  });

  useEffect(() => {
    const loadData = async () => {
      await loadStatuses();
      await loadPosts();
    };
    loadData();
  }, [action.id]);

  useEffect(() => {
    if (statusConfigs.length > 0 && posts.length > 0) {
      setPeriodStatuses(calculatePeriodStatuses(posts));
    }
  }, [statusConfigs, posts]);

  useEffect(() => {
    const subscription = supabase
      .channel(`recurring_action_${action.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'social_media_posts',
          filter: `recurring_action_id=eq.${action.id}`,
        },
        (payload) => {
          console.log('Post changed for action:', action.id, payload);
          loadPosts();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [action.id]);

  const loadStatuses = async () => {
    try {
      const { data, error } = await supabase
        .from('post_statuses')
        .select('name, color')
        .eq('is_active', true);

      if (error) throw error;
      setStatusConfigs(data || []);
    } catch (error) {
      console.error('Error loading statuses:', error);
    }
  };

  const getRequiredCount = (frequency: string): number => {
    if (!frequency) return 1;
    const match = frequency.match(/(\d+)x/i);
    return match ? parseInt(match[1]) : 1;
  };

  const getStatusCategory = (status: string): 'none' | 'draft' | 'in-progress' | 'published' => {
    if (!status) return 'none';

    const config = statusConfigs.find(s => s.name === status);
    if (!config) return 'none';

    const statusLower = status.toLowerCase();
    if (statusLower.includes('publikov') || statusLower === 'published') return 'published';
    if (statusLower.includes('proces') || statusLower.includes('ready') || statusLower === 'scheduled') return 'in-progress';
    if (statusLower.includes('draft') || statusLower.includes('nezahájeno')) return 'draft';

    return 'draft';
  };

  const checkPeriodStatus = (posts: Post[], startDate: Date, endDate: Date, requiredCount: number): PeriodStatus => {
    const postsInPeriod = posts.filter(post => {
      const postDate = new Date(post.scheduled_date);
      return postDate >= startDate && postDate <= endDate;
    });

    const publishedCount = postsInPeriod.filter(p => {
      const category = getStatusCategory(p.status);
      return category === 'published';
    }).length;
    const inProgressCount = postsInPeriod.filter(p => getStatusCategory(p.status) === 'in-progress').length;
    const draftCount = postsInPeriod.filter(p => getStatusCategory(p.status) === 'draft').length;

    let overallStatus: 'none' | 'draft' | 'in-progress' | 'published' = 'none';

    if (publishedCount >= requiredCount) {
      overallStatus = 'published';
    } else if (publishedCount > 0 || inProgressCount >= requiredCount) {
      overallStatus = 'in-progress';
    } else if (inProgressCount > 0 || draftCount > 0) {
      overallStatus = 'in-progress';
    } else if (postsInPeriod.length > 0) {
      overallStatus = 'draft';
    }

    return {
      label: format(startDate, 'MMM', { locale: cs }).toUpperCase(),
      status: overallStatus,
      requiredCount,
      actualCount: postsInPeriod.length,
      publishedCount,
      inProgressCount,
    };
  };

  const calculatePeriodStatuses = (posts: Post[]) => {
    const now = new Date();
    const requiredCount = getRequiredCount(action.frequency);
    const statuses: PeriodStatus[] = [];

    if (action.action_type === 'monthly') {
      for (let i = 0; i < 3; i++) {
        const monthDate = addMonths(now, i);
        const start = startOfMonth(monthDate);
        const end = endOfMonth(monthDate);
        statuses.push(checkPeriodStatus(posts, start, end, requiredCount));
      }
    } else if (action.action_type === 'weekly') {
      for (let i = 0; i < 3; i++) {
        const monthDate = addMonths(now, i);
        const monthStart = startOfMonth(monthDate);
        const monthEnd = endOfMonth(monthDate);

        const weeklyBreakdown: Array<{
          publishedCount: number;
          inProgressCount: number;
          requiredCount: number;
        }> = [];

        let currentWeekStart = startOfWeek(monthStart, { locale: cs });
        while (currentWeekStart <= monthEnd) {
          const currentWeekEnd = endOfWeek(currentWeekStart, { locale: cs });

          const weekPosts = posts.filter(post => {
            const postDate = new Date(post.scheduled_date);
            return postDate >= currentWeekStart && postDate <= currentWeekEnd && postDate >= monthStart && postDate <= monthEnd;
          });

          const publishedCount = weekPosts.filter(p => getStatusCategory(p.status) === 'published').length;
          const inProgressCount = weekPosts.filter(p => getStatusCategory(p.status) === 'in-progress').length;

          weeklyBreakdown.push({
            publishedCount,
            inProgressCount,
            requiredCount,
          });

          currentWeekStart = addWeeks(currentWeekStart, 1);
        }

        const monthStatus = checkPeriodStatus(posts, monthStart, monthEnd, requiredCount * weeklyBreakdown.length);
        statuses.push({
          ...monthStatus,
          weeklyBreakdown,
        });
      }
    } else if (action.action_type === 'quarterly') {
      for (let i = 0; i < 2; i++) {
        const quarterDate = addMonths(now, i * 3);
        const start = startOfQuarter(quarterDate);
        const end = endOfQuarter(quarterDate);
        statuses.push({
          label: `Q${Math.floor(quarterDate.getMonth() / 3) + 1}`,
          ...checkPeriodStatus(posts, start, end, requiredCount),
        });
      }
    }

    return statuses;
  };

  const loadPosts = async () => {
    try {
      const { data, error } = await supabase
        .from('social_media_posts')
        .select('id, title, scheduled_date, status')
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

  const getStatusColorFromDb = (statusName: string): string => {
    const config = statusConfigs.find(s => s.name === statusName);
    return config?.color || '#9CA3AF';
  };

  const getStatusColor = (status: 'none' | 'draft' | 'in-progress' | 'published') => {
    switch (status) {
      case 'published':
        return 'fill-green-500 text-green-500';
      case 'in-progress':
        return 'fill-orange-500 text-orange-500';
      case 'draft':
        return 'fill-gray-400 text-gray-400';
      default:
        return 'fill-gray-300 text-gray-300';
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
            <div className="flex items-center gap-3 mb-2">
              {periodStatuses.map((status, index) => (
                <div key={index} className="flex flex-col items-center gap-1 flex-1 min-w-0">
                  <div className="w-full flex gap-0.5">
                    {status.weeklyBreakdown ? (
                      status.weeklyBreakdown.map((week, weekIndex) => (
                        <React.Fragment key={weekIndex}>
                          {weekIndex > 0 && (
                            <div className="w-[1px] h-2 bg-gray-400 mx-0.5" />
                          )}
                          <div className="flex-1 flex gap-0.5">
                            {Array.from({ length: week.requiredCount }).map((_, segmentIndex) => {
                              let segmentColor = 'bg-gray-200';
                              if (segmentIndex < week.publishedCount) {
                                segmentColor = 'bg-green-500';
                              } else if (segmentIndex < week.publishedCount + week.inProgressCount) {
                                segmentColor = 'bg-orange-500';
                              }
                              return (
                                <div
                                  key={segmentIndex}
                                  className={`h-2 flex-1 rounded-sm ${segmentColor}`}
                                />
                              );
                            })}
                          </div>
                        </React.Fragment>
                      ))
                    ) : (
                      Array.from({ length: status.requiredCount }).map((_, segmentIndex) => {
                        let segmentColor = 'bg-gray-200';
                        if (segmentIndex < status.publishedCount) {
                          segmentColor = 'bg-green-500';
                        } else if (segmentIndex < status.publishedCount + status.inProgressCount) {
                          segmentColor = 'bg-orange-500';
                        }
                        return (
                          <div
                            key={segmentIndex}
                            className={`h-2 flex-1 rounded-sm ${segmentColor}`}
                          />
                        );
                      })
                    )}
                  </div>
                  <span className="text-[10px] font-medium text-muted-foreground">
                    {status.label}
                  </span>
                </div>
              ))}
            </div>
            <h3 className="font-semibold text-sm mb-1">{action.title}</h3>
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
                    onClick={() => navigate('/calendar')}
                    className="flex items-center gap-2 text-xs p-2 rounded bg-muted/30 hover:bg-muted/70 transition-colors cursor-pointer group"
                  >
                    <div
                      className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: getStatusColorFromDb(post.status) }}
                    />
                    <span className="font-medium text-muted-foreground min-w-[70px]">
                      {formatPostDate(post.scheduled_date)}
                    </span>
                    <span className="truncate flex-1 group-hover:text-foreground transition-colors">{post.title}</span>
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0" style={{ borderColor: getStatusColorFromDb(post.status), color: getStatusColorFromDb(post.status) }}>
                      {post.status}
                    </Badge>
                    <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                ))}
              </div>
            )}

            {!isExpanded && posts.length > 0 && (
              <div
                onClick={() => navigate('/calendar')}
                className="flex items-center gap-2 text-xs text-muted-foreground mt-1 p-1.5 rounded hover:bg-muted/30 cursor-pointer transition-colors group"
              >
                <div
                  className="h-2 w-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: getStatusColorFromDb(posts[0].status) }}
                />
                <span className="group-hover:text-foreground transition-colors">
                  {formatPostDate(posts[0].scheduled_date)} - {posts[0].title}
                  {posts.length > 1 && (
                    <span className="ml-1">
                      (+{posts.length - 1} další)
                    </span>
                  )}
                </span>
                <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity ml-auto" />
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
