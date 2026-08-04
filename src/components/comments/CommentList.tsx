import { format } from 'date-fns';
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

// Fixed palette so each person gets a stable, distinguishable avatar color
// (hashed from their name) instead of every comment looking the same blue.
const AVATAR_COLORS = [
  '#E11D48', '#EA580C', '#D97706', '#65A30D',
  '#059669', '#0891B2', '#2563EB', '#7C3AED', '#C026D3',
];

function avatarColor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

function initials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// Slack-style: just the clock time for comments from today, otherwise date + time.
function formatCommentTime(ts: number): string {
  const date = new Date(ts);
  const isToday = date.toDateString() === new Date().toDateString();
  return format(date, isToday ? 'HH:mm' : 'd. M. HH:mm', { locale: cs });
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
      '<span class="text-blue-600 font-normal">@$1</span>',
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
    <div className="divide-y divide-gray-100">
      {comments.map((comment) => {
        const fullName = comment.author?.fullName || 'Unknown';
        return (
          <div key={comment._id} className="group flex gap-3 py-3 first:pt-0">
            <div className="flex-shrink-0">
              <div
                className="w-9 h-9 rounded-md flex items-center justify-center"
                style={{ backgroundColor: avatarColor(fullName) }}
              >
                <span className="text-xs font-semibold text-white">
                  {initials(fullName)}
                </span>
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2">
                <span className="font-bold text-sm text-gray-900">{fullName}</span>
                <span className="text-xs text-gray-500">
                  {formatCommentTime(comment.createdAt ?? Date.now())}
                </span>
              </div>

              <div
                className="text-sm text-gray-800 whitespace-pre-wrap mt-0.5"
                dangerouslySetInnerHTML={{
                  __html: highlightMentions(comment.content),
                }}
              />

              {onReply && comment.author?.fullName && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 mt-0.5 text-xs text-gray-500 opacity-0 group-hover:opacity-100 focus:opacity-100"
                  onClick={() => onReply(comment.author!.fullName)}
                >
                  <Reply className="h-3 w-3 mr-1" />
                  Odpovědět
                </Button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
