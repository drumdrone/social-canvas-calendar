import { formatDistanceToNow } from 'date-fns';
import { cs } from 'date-fns/locale';
import { MessageSquare, Reply } from 'lucide-react';
import { useQuery } from 'convex/react';
import { Button } from '@/components/ui/button';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';

interface CommentListProps {
  // The Convex Id of the post. If the caller only has the legacy Supabase
  // UUID (e.g. from the URL), pass it here — the query handles both via
  // legacyPostId lookup.
  postId: string;
  refreshTrigger?: number;
  // Called with the comment author's name when the "Odpovědět" button is
  // clicked, so the parent can hand it to CommentEditor as a ready-made @mention.
  onReply?: (authorName: string) => void;
}

export function CommentList({ postId, onReply }: CommentListProps) {
  // Comments are reactive: adding one anywhere updates every open list.
  // If the id looks like a Convex Id (starts with the deployment prefix and
  // is short), use listForPost; otherwise treat it as the legacy UUID.
  const isConvexId = /^k[a-z0-9]{10,}$/.test(postId);
  const comments = useQuery(
    isConvexId ? api.comments.listForPost : api.comments.listForPostByLegacyId,
    isConvexId
      ? { postId: postId as Id<'social_media_posts'> }
      : { legacyPostId: postId },
  );
  const loading = comments === undefined;

  function highlightMentions(text: string) {
    return text.replace(
      /@(\w+(?:\s+\w+)*)/g,
      '<span class="text-blue-600 font-medium">@$1</span>',
    );
  }

  if (loading) {
    return <div className="text-sm text-gray-500">Načítání komentářů...</div>;
  }

  if (!comments || comments.length === 0) {
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
        <div key={comment._id} className="flex gap-3 pb-4 border-b last:border-0">
          <div className="flex-shrink-0">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
              <span className="text-sm font-medium text-blue-600">
                {comment.author?.fullName?.charAt(0) || '?'}
              </span>
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2 mb-1">
              <span className="font-medium text-sm">
                {comment.author?.fullName || 'Unknown'}
              </span>
              <span className="text-xs text-gray-500">
                {formatDistanceToNow(new Date(comment.createdAt ?? Date.now()), {
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

            {onReply && comment.author?.fullName && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 px-2 mt-1 text-xs text-gray-500"
                onClick={() => onReply(comment.author!.fullName)}
              >
                <Reply className="h-3 w-3 mr-1" />
                Odpovědět
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
