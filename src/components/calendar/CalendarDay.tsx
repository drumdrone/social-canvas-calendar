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

  // Get background color based on month
  const getMonthBackground = (date: Date) => {
    const month = date.getMonth();
    const monthColors = [
      'bg-blue-50/80', // January
      'bg-purple-50/80', // February
      'bg-green-50/80', // March
      'bg-yellow-50/80', // April
      'bg-pink-50/80', // May
      'bg-cyan-50/80', // June
      'bg-orange-50/80', // July
      'bg-red-50/80', // August
      'bg-indigo-50/80', // September
      'bg-teal-50/80', // October
      'bg-amber-50/80', // November
      'bg-slate-50/80', // December
    ];
    return monthColors[month];
  };
  
  const monthBg = getMonthBackground(date);
  
  return (
    <div
      className={cn(
        "h-full border-r border-b border-calendar-grid cursor-pointer transition-colors hover:bg-calendar-hover relative overflow-hidden flex flex-col",
        !isCurrentMonth && "text-muted-foreground bg-muted/30",
        isCurrentMonth && monthBg,
        isWeekend && isCurrentMonth && "bg-opacity-60",
        isToday && "border-calendar-today border-2"
      )}
      onClick={onClick}
      style={{ minHeight: 'calc((100vh - 200px) / 6)' }}
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
      <div className="h-1/5 p-1 bg-white/90 backdrop-blur-sm border-t border-border/20">
        {posts.length > 0 ? (
          <div className="space-y-1">
            <div className="text-xs font-medium truncate">
              {posts[0].title}
            </div>
            {posts[0].content && (
              <div className="text-xs text-muted-foreground line-clamp-2 leading-tight">
                {posts[0].content}
              </div>
            )}
          </div>
        ) : (
          <div className="text-xs text-muted-foreground">
            Click to add
          </div>
        )}
        {posts.length > 1 && (
          <div className="text-xs text-muted-foreground truncate mt-1">
            +{posts.length - 1} more
          </div>
        )}
      </div>
    </div>
  );
};