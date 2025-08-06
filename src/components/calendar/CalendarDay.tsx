import React from 'react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { SocialPost } from '../SocialCalendar';
import { PostPreview } from './PostPreview';
import { Facebook, Instagram, Twitter, Linkedin } from 'lucide-react';

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
  
  const platformIcons = {
    facebook: Facebook,
    instagram: Instagram,
    twitter: Twitter,
    linkedin: Linkedin,
  };
  
  return (
    <div
      className={cn(
        "aspect-square border-r border-b border-calendar-grid cursor-pointer transition-colors hover:bg-calendar-hover relative overflow-hidden flex flex-col",
        !isCurrentMonth && "text-muted-foreground bg-muted/30",
        isWeekend && isCurrentMonth && "bg-calendar-weekend",
        isToday && "border-calendar-today border-2"
      )}
      onClick={onClick}
    >
      {/* Image Section - 80% */}
      {hasImage && firstImagePost?.image_url ? (
        <div className="h-4/5 relative">
          <img 
            src={firstImagePost.image_url} 
            alt="Post image" 
            className="w-full h-full object-cover"
          />
          {/* Platform icon */}
          <div className="absolute bottom-1 left-1">
            {(() => {
              const Icon = platformIcons[firstImagePost.platform];
              const platformColors = {
                facebook: "text-[#1877F2]",
                instagram: "text-[#E4405F]", 
                twitter: "text-[#1DA1F2]",
                linkedin: "text-[#0077B5]",
              };
              return (
                <div className="bg-white/90 backdrop-blur-sm rounded-full p-1 shadow-sm">
                  <Icon className={cn("w-3 h-3", platformColors[firstImagePost.platform])} />
                </div>
              );
            })()}
          </div>
          {/* Date overlay on image */}
          <div className="absolute top-1 left-1">
            <span
              className={cn(
                "text-xs font-bold text-white bg-black/50 rounded-full w-5 h-5 flex items-center justify-center",
                isToday && "bg-calendar-today text-calendar-today-foreground"
              )}
            >
              {format(date, 'd')}
            </span>
          </div>
          {/* Posts count if multiple */}
          {posts.length > 1 && (
            <div className="absolute top-1 right-1">
              <span className="text-xs font-bold text-white bg-black/50 rounded-full w-5 h-5 flex items-center justify-center">
                {posts.length}
              </span>
            </div>
          )}
        </div>
      ) : (
        /* No image - show date prominently */
        <div className="h-4/5 p-2 flex items-start justify-between">
          <span
            className={cn(
              "text-sm font-medium",
              isToday && "bg-calendar-today text-calendar-today-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold"
            )}
          >
            {format(date, 'd')}
          </span>
          {posts.length > 0 && (
            <span className="text-xs font-bold bg-muted rounded-full w-5 h-5 flex items-center justify-center">
              {posts.length}
            </span>
          )}
        </div>
      )}

      {/* Description Section - 20% */}
      <div className="h-1/5 p-1 bg-background/95 backdrop-blur-sm border-t border-border/20">
        {posts.length > 0 ? (
          <div className="text-sm truncate font-medium">
            {posts[0].title}
          </div>
        ) : (
          <div className="text-xs text-muted-foreground">
            Click to add
          </div>
        )}
        {posts.length > 1 && (
          <div className="text-xs text-muted-foreground truncate">
            +{posts.length - 1} more
          </div>
        )}
      </div>
    </div>
  );
};