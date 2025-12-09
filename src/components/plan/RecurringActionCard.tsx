import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Trash2, Edit2, Check, X, GripVertical, Plus, Unlink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { PostQuickAdd } from './PostQuickAdd';
import { PostsList } from './PostsList';

export interface RecurringAction {
  id: string;
  user_id: string;
  action_type: 'monthly' | 'weekly' | 'quarterly';
  title: string;
  subtitle: string;
  description: string;
  data: Record<string, any>;
  color: string;
  order_index: number;
  month: string;
  group_id?: string | null;
  template_id?: string | null;
  is_custom?: boolean;
  created_at: string;
  updated_at: string;
}

interface RecurringActionCardProps {
  action: RecurringAction;
  onUpdate: (updates: Partial<RecurringAction>) => void;
  onDelete: () => void;
}

interface Post {
  id: string;
  title: string;
  scheduled_date: string;
}

export const RecurringActionCard: React.FC<RecurringActionCardProps> = ({
  action,
  onUpdate,
  onDelete,
}) => {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isAddingPost, setIsAddingPost] = useState(false);
  const [posts, setPosts] = useState<Post[]>([]);
  const [editData, setEditData] = useState({
    title: action.title,
    subtitle: action.subtitle,
    description: action.description,
    data: action.data,
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
        .order('scheduled_date', { ascending: true });

      if (error) throw error;
      setPosts(data || []);
    } catch (error) {
      console.error('Error loading posts:', error);
    }
  };

  const handleAddPost = async (title: string, date: Date) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('social_media_posts')
        .insert({
          user_id: user.id,
          recurring_action_id: action.id,
          title,
          scheduled_date: date.toISOString(),
          status: 'draft',
        });

      if (error) throw error;

      toast.success('Post přidán');
      setIsAddingPost(false);
      await loadPosts();
    } catch (error) {
      console.error('Error adding post:', error);
      toast.error('Chyba při přidávání postu');
    }
  };

  const handleDeletePost = async (postId: string) => {
    try {
      const { error } = await supabase
        .from('social_media_posts')
        .delete()
        .eq('id', postId);

      if (error) throw error;

      toast.success('Post smazán');
      await loadPosts();
    } catch (error) {
      console.error('Error deleting post:', error);
      toast.error('Chyba při mazání postu');
    }
  };

  const handleSave = () => {
    onUpdate(editData);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditData({
      title: action.title,
      subtitle: action.subtitle,
      description: action.description,
      data: action.data,
    });
    setIsEditing(false);
  };

  const handleUnlinkFromTemplate = async () => {
    if (!action.template_id) return;

    try {
      const { error } = await supabase
        .from('recurring_actions')
        .update({ is_custom: true })
        .eq('id', action.id);

      if (error) throw error;

      onUpdate({ is_custom: true });
      toast.success('Akce odvázána od šablony');
    } catch (error) {
      console.error('Error unlinking from template:', error);
      toast.error('Chyba při odvazování od šablony');
    }
  };

  const renderContent = () => {
    if (action.action_type === 'weekly') {
      const posts = action.data.posts || [];
      const weeksCount = action.data.weeks_count || 4;

      return (
        <div className="space-y-3">
          {isEditing ? (
            <>
              <Input
                placeholder="Počet týdnů"
                type="number"
                value={editData.data.weeks_count || 4}
                onChange={(e) => setEditData({
                  ...editData,
                  data: { ...editData.data, weeks_count: parseInt(e.target.value) || 4 }
                })}
              />
              <Textarea
                placeholder="Posty (jeden na řádek, např: 'Post 1: Jarní energie - matcha kolekce')"
                value={(editData.data.posts || []).join('\n')}
                onChange={(e) => setEditData({
                  ...editData,
                  data: { ...editData.data, posts: e.target.value.split('\n').filter(p => p.trim()) }
                })}
                rows={6}
              />
            </>
          ) : (
            <>
              <Badge variant="secondary" className="mb-2">
                {posts.length} postů celkem
              </Badge>
              <div className="space-y-3">
                {Array.from({ length: weeksCount }, (_, weekIndex) => {
                  const weekPosts = posts.filter((_: any, i: number) =>
                    Math.floor(i / (posts.length / weeksCount)) === weekIndex
                  );

                  return (
                    <div key={weekIndex} className="border-l-2 border-blue-400 pl-3">
                      <div className="text-xs font-semibold text-blue-600 mb-1">
                        Týden {weekIndex + 1}
                      </div>
                      {weekPosts.map((post: string, idx: number) => (
                        <div key={idx} className="text-sm text-muted-foreground">
                          {post}
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      );
    }

    if (action.action_type === 'monthly') {
      return (
        <div className="space-y-2 text-sm">
          {isEditing ? (
            <>
              <Input
                placeholder="Téma"
                value={editData.data.theme || ''}
                onChange={(e) => setEditData({
                  ...editData,
                  data: { ...editData.data, theme: e.target.value }
                })}
              />
              <Input
                placeholder="Produkty"
                value={editData.data.products || ''}
                onChange={(e) => setEditData({
                  ...editData,
                  data: { ...editData.data, products: e.target.value }
                })}
              />
              <Input
                placeholder="Kanály (oddělené čárkou)"
                value={editData.data.channels || ''}
                onChange={(e) => setEditData({
                  ...editData,
                  data: { ...editData.data, channels: e.target.value }
                })}
              />
            </>
          ) : (
            <>
              {action.data.theme && (
                <div><span className="font-medium">Téma:</span> {action.data.theme}</div>
              )}
              {action.data.products && (
                <div><span className="font-medium">Produkty:</span> {action.data.products}</div>
              )}
              {action.data.channels && (
                <div><span className="font-medium">Kanály:</span> {action.data.channels}</div>
              )}
            </>
          )}
        </div>
      );
    }

    if (action.action_type === 'quarterly') {
      return (
        <div className="space-y-2 text-sm">
          {isEditing ? (
            <>
              <Input
                placeholder="Hashtag"
                value={editData.data.hashtag || ''}
                onChange={(e) => setEditData({
                  ...editData,
                  data: { ...editData.data, hashtag: e.target.value }
                })}
              />
              <Textarea
                placeholder="Mechanika"
                value={editData.data.mechanics || ''}
                onChange={(e) => setEditData({
                  ...editData,
                  data: { ...editData.data, mechanics: e.target.value }
                })}
                rows={2}
              />
              <Input
                placeholder="Výhra"
                value={editData.data.prize || ''}
                onChange={(e) => setEditData({
                  ...editData,
                  data: { ...editData.data, prize: e.target.value }
                })}
              />
              <Input
                placeholder="Platformy"
                value={editData.data.platforms || ''}
                onChange={(e) => setEditData({
                  ...editData,
                  data: { ...editData.data, platforms: e.target.value }
                })}
              />
              <Input
                placeholder="Vyhlášení (datum)"
                value={editData.data.announcement_date || ''}
                onChange={(e) => setEditData({
                  ...editData,
                  data: { ...editData.data, announcement_date: e.target.value }
                })}
              />
            </>
          ) : (
            <>
              {action.data.hashtag && (
                <div><span className="font-medium">Hashtag:</span> {action.data.hashtag}</div>
              )}
              {action.data.mechanics && (
                <div><span className="font-medium">Mechanika:</span> {action.data.mechanics}</div>
              )}
              {action.data.prize && (
                <div><span className="font-medium">Výhra:</span> {action.data.prize}</div>
              )}
              {action.data.platforms && (
                <div><span className="font-medium">Platformy:</span> {action.data.platforms}</div>
              )}
              {action.data.announcement_date && (
                <div><span className="font-medium">Vyhlášení:</span> {action.data.announcement_date}</div>
              )}
            </>
          )}
        </div>
      );
    }

    return null;
  };

  const getBorderColor = () => {
    switch (action.action_type) {
      case 'monthly': return 'border-purple-400';
      case 'weekly': return 'border-blue-400';
      case 'quarterly': return 'border-orange-400';
      default: return 'border-gray-400';
    }
  };

  const getBackgroundColor = () => {
    switch (action.action_type) {
      case 'monthly': return 'bg-purple-50';
      case 'weekly': return 'bg-blue-50';
      case 'quarterly': return 'bg-orange-50';
      default: return 'bg-gray-50';
    }
  };

  return (
    <Card className={`${getBorderColor()} border-l-4 ${getBackgroundColor()}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            {isEditing ? (
              <div className="space-y-2">
                <Input
                  value={editData.title}
                  onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                  className="font-semibold"
                  placeholder="Nadpis (např. Recept 1)"
                />
                <Input
                  value={editData.subtitle}
                  onChange={(e) => setEditData({ ...editData, subtitle: e.target.value })}
                  className="text-sm"
                  placeholder="Podnadpis (např. Muffiny)"
                />
              </div>
            ) : (
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                  {action.title || 'Bez názvu'}
                  {action.template_id && !action.is_custom && (
                    <Badge variant="secondary" className="text-xs">
                      Ze šablony
                    </Badge>
                  )}
                </CardTitle>
                {action.subtitle && (
                  <p className="text-sm text-muted-foreground mt-1 ml-6">{action.subtitle}</p>
                )}
              </div>
            )}
          </div>
          <div className="flex gap-1">
            {isEditing ? (
              <>
                <Button size="sm" variant="ghost" onClick={handleSave}>
                  <Check className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="ghost" onClick={handleCancel}>
                  <X className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <>
                <Button size="sm" variant="ghost" onClick={() => setIsAddingPost(true)} title="Přidat post">
                  <Plus className="h-4 w-4" />
                </Button>
                {action.template_id && !action.is_custom && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleUnlinkFromTemplate}
                    title="Odvázat od šablony"
                  >
                    <Unlink className="h-4 w-4" />
                  </Button>
                )}
                <Button size="sm" variant="ghost" onClick={() => setIsEditing(true)}>
                  <Edit2 className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={onDelete}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </div>
        {isEditing ? (
          <Textarea
            value={editData.description}
            onChange={(e) => setEditData({ ...editData, description: e.target.value })}
            placeholder="Popis"
            rows={2}
            className="text-sm"
          />
        ) : (
          action.description && (
            <p className="text-sm text-muted-foreground mt-1">{action.description}</p>
          )
        )}
      </CardHeader>
      <CardContent>
        {renderContent()}

        {!isEditing && (
          <>
            {isAddingPost && (
              <>
                <Separator className="my-4" />
                <PostQuickAdd onAdd={handleAddPost} onCancel={() => setIsAddingPost(false)} />
              </>
            )}
            {posts.length > 0 && (
              <>
                <Separator className="my-4" />
                <PostsList posts={posts} onDelete={handleDeletePost} />
              </>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};
