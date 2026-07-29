import { useState, useMemo, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useAction } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';

// Convex-shaped user for the @mention dropdown.
interface MentionUser {
  _id: Id<'user_profiles'>;
  fullName: string;
  email: string;
}

interface CommentEditorProps {
  // Convex Id of the post OR the legacy Supabase UUID kept in
  // social_media_posts.legacyId. Both cases resolve to a Convex Id below.
  postId: string;
  onCommentAdded?: () => void;
}

export function CommentEditor({ postId, onCommentAdded }: CommentEditorProps) {
  const [content, setContent] = useState('');
  const [showMentions, setShowMentions] = useState(false);
  const [mentionSearch, setMentionSearch] = useState('');
  const [selectedMentionIndex, setSelectedMentionIndex] = useState(0);
  const [mentionPosition, setMentionPosition] = useState({ top: 0, left: 0 });
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();

  // Reactive user list for @mention autocomplete.
  const rawUsers = useQuery(api.userProfiles.list);
  const users = useMemo<MentionUser[]>(
    () =>
      (rawUsers ?? []).map((u: any) => ({
        _id: u._id,
        fullName: u.fullName,
        email: u.email,
      })),
    [rawUsers],
  );

  // Resolve the incoming postId to a Convex Id. If it looks like a legacy
  // UUID, look it up; otherwise trust it.
  const isConvexId = /^k[a-z0-9]{10,}$/.test(postId);
  const postByLegacy = useQuery(
    isConvexId ? 'skip' : api.posts.getByLegacyId,
    isConvexId ? 'skip' : { legacyId: postId },
  );
  const resolvedPostId: Id<'social_media_posts'> | null = isConvexId
    ? (postId as Id<'social_media_posts'>)
    : (postByLegacy?._id ?? null);

  const addComment = useAction(api.comments.addComment);

  function handleTextChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const text = e.target.value;
    setContent(text);

    const cursorPosition = e.target.selectionStart;
    const textBeforeCursor = text.substring(0, cursorPosition);
    const mentionMatch = textBeforeCursor.match(/@(\w*)$/);

    if (mentionMatch) {
      setMentionSearch(mentionMatch[1].toLowerCase());
      setShowMentions(true);
      setSelectedMentionIndex(0);
      if (textareaRef.current) {
        const rect = textareaRef.current.getBoundingClientRect();
        setMentionPosition({ top: rect.bottom, left: rect.left });
      }
    } else {
      setShowMentions(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (!showMentions) return;
    const filtered = users.filter(
      (u) =>
        u.fullName.toLowerCase().includes(mentionSearch) ||
        u.email.toLowerCase().includes(mentionSearch),
    );
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedMentionIndex((prev) => (prev < filtered.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedMentionIndex((prev) => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      if (filtered[selectedMentionIndex]) insertMention(filtered[selectedMentionIndex]);
    } else if (e.key === 'Escape') {
      setShowMentions(false);
    }
  }

  function insertMention(user: MentionUser) {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const cursorPosition = textarea.selectionStart;
    const textBeforeCursor = content.substring(0, cursorPosition);
    const textAfterCursor = content.substring(cursorPosition);
    const mentionMatch = textBeforeCursor.match(/@(\w*)$/);
    if (mentionMatch) {
      const beforeMention = textBeforeCursor.substring(
        0,
        textBeforeCursor.length - mentionMatch[0].length,
      );
      const newContent = `${beforeMention}@${user.fullName} ${textAfterCursor}`;
      setContent(newContent);
      setTimeout(() => {
        const newCursorPos = beforeMention.length + user.fullName.length + 2;
        textarea.setSelectionRange(newCursorPos, newCursorPos);
        textarea.focus();
      }, 0);
    }
    setShowMentions(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) {
      toast({
        title: 'Chyba',
        description: 'Komentář nemůže být prázdný',
        variant: 'destructive',
      });
      return;
    }
    if (!resolvedPostId) {
      toast({
        title: 'Chyba',
        description: 'Nepodařilo se najít cílový post',
        variant: 'destructive',
      });
      return;
    }
    // Placeholder for the "current user" author (SimpleAuthGate has no user
    // concept yet). Falls back to the first user_profiles row like the old
    // Supabase code did — swap once real auth is wired up.
    const firstUser = users[0];
    if (!firstUser) {
      toast({
        title: 'Chyba',
        description: 'Nejsou žádní uživatelé',
        variant: 'destructive',
      });
      return;
    }
    // Parse @mentions out of the content and map them to user ids.
    const mentionedNames = Array.from(content.matchAll(/@(\w+(?:\s+\w+)*)/g)).map(
      (m) => m[1],
    );
    const mentionedUserIds = users
      .filter((u) => mentionedNames.some((name) => u.fullName.includes(name)))
      .map((u) => u._id);

    try {
      await addComment({
        postId: resolvedPostId,
        authorId: firstUser._id,
        content,
        mentionedUserIds,
      });
      toast({
        title: 'Úspěch',
        description:
          mentionedUserIds.length > 0
            ? `Komentář přidán a ${mentionedUserIds.length} uživatelů bylo upozorněno`
            : 'Komentář přidán',
      });
      setContent('');
      onCommentAdded?.();
    } catch (error: any) {
      toast({
        title: 'Chyba',
        description: error?.message ?? 'Nepodařilo se přidat komentář',
        variant: 'destructive',
      });
    }
  }

  const filteredUsers = users.filter(
    (u) =>
      u.fullName.toLowerCase().includes(mentionSearch) ||
      u.email.toLowerCase().includes(mentionSearch),
  );

  return (
    <div className="relative">
      <form onSubmit={handleSubmit} className="space-y-2">
        <Textarea
          ref={textareaRef}
          value={content}
          onChange={handleTextChange}
          onKeyDown={handleKeyDown}
          placeholder="Napište komentář... (použijte @ pro označení uživatele)"
          rows={3}
          className="w-full"
        />

        <Button type="submit" size="sm">
          <Send className="h-4 w-4 mr-2" />
          Odeslat komentář
        </Button>
      </form>

      {showMentions && filteredUsers.length > 0 && (
        <div
          className="absolute z-50 w-64 bg-white border rounded-lg shadow-lg max-h-48 overflow-auto"
          style={{
            top: mentionPosition.top + 4,
            left: mentionPosition.left,
          }}
        >
          {filteredUsers.map((user, index) => (
            <div
              key={user._id}
              className={`px-4 py-2 cursor-pointer ${
                index === selectedMentionIndex ? 'bg-blue-100' : 'hover:bg-gray-100'
              }`}
              onClick={() => insertMention(user)}
            >
              <div className="font-medium">{user.fullName}</div>
              <div className="text-xs text-gray-500">{user.email}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
