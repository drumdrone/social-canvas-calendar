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
    <div className="space-y-2 mt-3">
      <div className="text-xs font-semibold text-foreground/70 uppercase tracking-wide mb-2">
        Napojené instance ({posts.length})
      </div>
      {posts.map((post) => (
        <div
          key={post.id}
          className="flex items-center justify-between gap-2 p-3 bg-gradient-to-r from-blue-50 to-blue-100/50 rounded-md border-l-4 border-blue-500 hover:shadow-sm transition-all"
        >
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <span className="text-xs font-bold text-blue-700 bg-white px-2 py-1 rounded whitespace-nowrap">
              {format(new Date(post.scheduled_date), 'd.M.yyyy', { locale: cs })}
            </span>
            <span className="text-sm font-semibold text-foreground truncate">{post.title}</span>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onDelete(post.id)}
            className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive flex-shrink-0"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
    </div>
  );
};
