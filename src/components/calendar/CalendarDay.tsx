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
  const hasImage = posts.some(post => post.image_url);
  const firstImagePost = posts.find(post => post.image_url);
  
  return (
    <div
      className={cn(
        "aspect-square border-r border-b border-calendar-grid p-2 cursor-pointer transition-colors hover:bg-calendar-hover relative overflow-hidden",
        !isCurrentMonth && "text-muted-foreground bg-muted/30",
        isWeekend && isCurrentMonth && "bg-calendar-weekend",
        isToday && "bg-calendar-today/20 border-calendar-today border-2"
      )}
      onClick={onClick}
    >
      {/* Background Image */}
      {hasImage && firstImagePost?.image_url && (
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-20"
          style={{ backgroundImage: `url(${firstImagePost.image_url})` }}
        />
      )}
      {/* Content overlay */}
      <div className="relative z-10 h-full flex flex-col">
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
        
        <div className="space-y-1 flex-1 overflow-hidden">
          {posts.slice(0, 2).map((post) => (
            <PostPreview key={post.id} post={post} onClick={() => onPostClick(post)} compact />
          ))}
          
          {posts.length > 2 && (
            <div className="text-xs text-muted-foreground p-1 bg-background/80 rounded backdrop-blur-sm">
              +{posts.length - 2} more
            </div>
          )}
        </div>
      </div>
    </div>
  );
};