import React from 'react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { SocialPost } from '../SocialCalendar';
import { PostPreview } from './PostPreview';

interface CalendarDayProps {
  date: Date;
  posts: SocialPost[];
  isCurrentMonth: boolean;
  isToday: boolean;
  isWeekend: boolean;
  onClick: () => void;
  onPostClick: (post: SocialPost) => void;
}

export const CalendarDay: React.FC<CalendarDayProps> = ({
  date,
  posts,
  isCurrentMonth,
  isToday,
  isWeekend,
  onClick,
  onPostClick,
}) => {
  return (
    <div
      className={cn(
        "min-h-[120px] border-r border-b border-calendar-grid p-2 cursor-pointer transition-colors hover:bg-calendar-hover",
        !isCurrentMonth && "text-muted-foreground bg-muted/30",
        isWeekend && isCurrentMonth && "bg-calendar-weekend",
        isToday && "bg-calendar-today/20 border-calendar-today border-2"
      )}
      onClick={onClick}
    >
      <div className="flex items-center justify-between mb-2">
        <span
          className={cn(
            "text-sm font-medium",
            isToday && "bg-calendar-today text-calendar-today-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold"
          )}
        >
          {format(date, 'd')}
        </span>
      </div>
      
      <div className="space-y-1">
        {posts.slice(0, 3).map((post) => (
          <PostPreview key={post.id} post={post} onClick={() => onPostClick(post)} />
        ))}
        
        {posts.length > 3 && (
          <div className="text-xs text-muted-foreground p-1 bg-muted rounded">
            +{posts.length - 3} more
          </div>
        )}
      </div>
    </div>
  );
};