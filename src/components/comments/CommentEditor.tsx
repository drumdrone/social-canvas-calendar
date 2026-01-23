import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { UserProfile } from '@/types/comments';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface CommentEditorProps {
  postId: string;
  onCommentAdded?: () => void;
}

export function CommentEditor({ postId, onCommentAdded }: CommentEditorProps) {
  const [content, setContent] = useState('');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionSearch, setMentionSearch] = useState('');
  const [selectedMentionIndex, setSelectedMentionIndex] = useState(0);
  const [mentionPosition, setMentionPosition] = useState({ top: 0, left: 0 });
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadUsers();
  }, []);

  async function loadUsers() {
    const { data } = await supabase
      .from('user_profiles')
      .select('*')
      .order('full_name');

    if (data) setUsers(data);
  }

  function handleTextChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const text = e.target.value;
    setContent(text);

    // Check for @ mentions
    const cursorPosition = e.target.selectionStart;
    const textBeforeCursor = text.substring(0, cursorPosition);
    const mentionMatch = textBeforeCursor.match(/@(\w*)$/);

    if (mentionMatch) {
      setMentionSearch(mentionMatch[1].toLowerCase());
      setShowMentions(true);
      setSelectedMentionIndex(0);

      // Calculate mention dropdown position
      if (textareaRef.current) {
        const textarea = textareaRef.current;
        const rect = textarea.getBoundingClientRect();
        setMentionPosition({
          top: rect.bottom,
          left: rect.left,
        });
      }
    } else {
      setShowMentions(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (!showMentions) return;

    const filteredUsers = users.filter(
      (user) =>
        user.full_name.toLowerCase().includes(mentionSearch) ||
        user.email.toLowerCase().includes(mentionSearch)
    );

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedMentionIndex((prev) =>
        prev < filteredUsers.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedMentionIndex((prev) => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      if (filteredUsers[selectedMentionIndex]) {
        insertMention(filteredUsers[selectedMentionIndex]);
      }
    } else if (e.key === 'Escape') {
      setShowMentions(false);
    }
  }

  function insertMention(user: UserProfile) {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const cursorPosition = textarea.selectionStart;
    const textBeforeCursor = content.substring(0, cursorPosition);
    const textAfterCursor = content.substring(cursorPosition);

    // Replace @search with @FullName
    const mentionMatch = textBeforeCursor.match(/@(\w*)$/);
    if (mentionMatch) {
      const beforeMention = textBeforeCursor.substring(
        0,
        textBeforeCursor.length - mentionMatch[0].length
      );
      const newContent = `${beforeMention}@${user.full_name} ${textAfterCursor}`;
      setContent(newContent);

      // Set cursor position after mention
      setTimeout(() => {
        const newCursorPos = beforeMention.length + user.full_name.length + 2;
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

    try {
      // Get first user as author (in real app, use authenticated user)
      const firstUser = users[0];
      if (!firstUser) {
        toast({
          title: 'Chyba',
          description: 'Nejsou žádní uživatelé',
          variant: 'destructive',
        });
        return;
      }

      // Insert comment
      const { data: comment, error: commentError } = await supabase
        .from('comments')
        .insert({
          post_id: postId,
          author_id: firstUser.id,
          content: content,
        })
        .select()
        .single();

      if (commentError) throw commentError;

      // Extract mentioned users from content
      const mentionMatches = content.matchAll(/@(\w+(?:\s+\w+)*)/g);
      const mentionedNames = Array.from(mentionMatches).map((match) => match[1]);

      // Find mentioned users
      const mentionedUsers = users.filter((user) =>
        mentionedNames.some((name) => user.full_name.includes(name))
      );

      // Insert mentions
      if (mentionedUsers.length > 0 && comment) {
        const mentions = mentionedUsers.map((user) => ({
          comment_id: comment.id,
          mentioned_user_id: user.id,
        }));

        const { error: mentionError } = await supabase
          .from('comment_mentions')
          .insert(mentions);

        if (mentionError) throw mentionError;

        // Fetch notifications created by the trigger and send emails
        const { data: notifications } = await supabase
          .from('notifications')
          .select('id')
          .eq('comment_id', comment.id);

        // Call Edge Function to send email notifications
        if (notifications && notifications.length > 0) {
          for (const notification of notifications) {
            try {
              await supabase.functions.invoke('send-mention-email', {
                body: { notification_id: notification.id }
              });
            } catch (emailError) {
              console.error('Error sending email notification:', emailError);
              // Don't throw - comment was created successfully
            }
          }
        }
      }

      toast({
        title: 'Úspěch',
        description: `Komentář přidán${mentionedUsers.length > 0 ? ` a ${mentionedUsers.length} uživatelé byli upozorněni` : ''}`,
      });

      setContent('');
      onCommentAdded?.();
    } catch (error: any) {
      toast({
        title: 'Chyba',
        description: error.message,
        variant: 'destructive',
      });
    }
  }

  const filteredUsers = users.filter(
    (user) =>
      user.full_name.toLowerCase().includes(mentionSearch) ||
      user.email.toLowerCase().includes(mentionSearch)
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

      {/* Mention autocomplete dropdown */}
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
              key={user.id}
              className={`px-4 py-2 cursor-pointer ${
                index === selectedMentionIndex
                  ? 'bg-blue-100'
                  : 'hover:bg-gray-100'
              }`}
              onClick={() => insertMention(user)}
            >
              <div className="font-medium">{user.full_name}</div>
              <div className="text-xs text-gray-500">{user.email}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
