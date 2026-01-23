import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { CommentWithAuthor } from '@/types/comments';
import { formatDistanceToNow } from 'date-fns';
import { cs } from 'date-fns/locale';
import { MessageSquare } from 'lucide-react';

interface CommentListProps {
  postId: string;
  refreshTrigger?: number;
}

export function CommentList({ postId, refreshTrigger }: CommentListProps) {
  const [comments, setComments] = useState<CommentWithAuthor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadComments();
  }, [postId, refreshTrigger]);

  async function loadComments() {
    try {
      const { data, error } = await supabase
        .from('comments')
        .select(`
          *,
          author:user_profiles!comments_author_id_fkey(*)
        `)
        .eq('post_id', postId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setComments(data as any || []);
    } catch (error) {
      console.error('Error loading comments:', error);
    } finally {
      setLoading(false);
    }
  }

  function highlightMentions(text: string) {
    return text.replace(
      /@(\w+(?:\s+\w+)*)/g,
      '<span class="text-blue-600 font-medium">@$1</span>'
    );
  }

  if (loading) {
    return <div className="text-sm text-gray-500">Načítání komentářů...</div>;
  }

  if (comments.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <div className="text-sm">Zatím žádné komentáře</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {comments.map((comment) => (
        <div key={comment.id} className="flex gap-3 pb-4 border-b last:border-0">
          <div className="flex-shrink-0">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
              <span className="text-sm font-medium text-blue-600">
                {comment.author?.full_name?.charAt(0) || '?'}
              </span>
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2 mb-1">
              <span className="font-medium text-sm">
                {comment.author?.full_name || 'Unknown'}
              </span>
              <span className="text-xs text-gray-500">
                {formatDistanceToNow(new Date(comment.created_at), {
                  addSuffix: true,
                  locale: cs,
                })}
              </span>
            </div>

            <div
              className="text-sm text-gray-700 whitespace-pre-wrap"
              dangerouslySetInnerHTML={{
                __html: highlightMentions(comment.content),
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
