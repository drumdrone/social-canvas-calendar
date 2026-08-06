import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { MessageSquare, Reply, Trash2 } from 'lucide-react';
import { useQuery, useMutation } from 'convex/react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import { avatarColor, initials } from '@/lib/commentAvatar';

interface CommentListProps {
  // The Convex Id of the post. If the caller only has the legacy Supabase
  // UUID (e.g. from the URL), pass it here — the query handles both via
  // legacyPostId lookup.
  postId: string;
  refreshTrigger?: number;
  // Called with the replied-to comment's author + text when "Odpovědět" is
  // clicked, so the parent can hand it to CommentEditor as a ready-made
  // @mention plus a quoted preview.
  onReply?: (target: { authorName: string; content: string }) => void;
}

// Slack-style: just the clock time for comments from today, otherwise date + time.
function formatCommentTime(ts: number): string {
  const date = new Date(ts);
  const isToday = date.toDateString() === new Date().toDateString();
  return format(date, isToday ? 'HH:mm' : 'd. M. HH:mm', { locale: cs });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function CommentList({ postId, onReply }: CommentListProps) {
  // Comments are reactive: adding one anywhere updates every open list.
  // listForPostByLegacyId resolves either a real Convex _id or the legacy
  // Supabase UUID server-side, so there's no need to guess the id's shape
  // here.
  const comments = useQuery(api.comments.listForPostByLegacyId, { legacyPostId: postId });
  // Real user names bound the @mention match — without this, "@Jan Hrodek
  // dobře" greedily highlighted the entire rest of the sentence, since
  // there's nothing else to tell the regex where the name ends.
  const rawUsers = useQuery(api.userProfiles.list);
  const mentionNames = (rawUsers ?? [])
    .map((u: any) => u.fullName as string)
    .filter(Boolean)
    .sort((a, b) => b.length - a.length);
  const loading = comments === undefined;
  const removeComment = useMutation(api.comments.remove);
  const { toast } = useToast();

  async function handleDelete(id: Id<'comments'>) {
    if (!confirm('Opravdu smazat tento komentář?')) return;
    try {
      await removeComment({ id });
    } catch (error: any) {
      toast({
        title: 'Chyba',
        description: error?.message ?? 'Nepodařilo se smazat komentář',
        variant: 'destructive',
      });
    }
  }

  function highlightMentions(text: string) {
    const escaped = escapeHtml(text);
    if (mentionNames.length === 0) return escaped;
    const pattern = new RegExp(
      `@(${mentionNames.map((n) => escapeRegExp(escapeHtml(n))).join('|')})\\b`,
      'g',
    );
    return escaped.replace(pattern, '<span class="text-blue-600">@$1</span>');
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

              <div className="flex items-center opacity-0 group-hover:opacity-100 focus-within:opacity-100">
                {onReply && comment.author?.fullName && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 mt-0.5 text-xs text-gray-500"
                    onClick={() => onReply({ authorName: fullName, content: comment.content })}
                  >
                    <Reply className="h-3 w-3 mr-1" />
                    Odpovědět
                  </Button>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 mt-0.5 text-xs text-red-500 hover:text-red-600"
                  onClick={() => handleDelete(comment._id)}
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  Smazat
                </Button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
