import React from 'react';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';

interface Post {
  id: string;
  title: string;
  scheduled_date: string;
}

interface PostsListProps {
  posts: Post[];
  onDelete: (postId: string) => void;
}

export const PostsList: React.FC<PostsListProps> = ({ posts, onDelete }) => {
  if (posts.length === 0) {
    return null;
  }

  return (
    <div className="space-y-1 mt-3">
      {posts.map((post) => (
        <div
          key={post.id}
          className="flex items-center justify-between gap-2 p-2 bg-background/50 rounded border border-border/50 hover:border-border transition-colors"
        >
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
              {format(new Date(post.scheduled_date), 'd.M.yyyy', { locale: cs })}
            </span>
            <span className="text-sm truncate">{post.title}</span>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onDelete(post.id)}
            className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive flex-shrink-0"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      ))}
    </div>
  );
};
