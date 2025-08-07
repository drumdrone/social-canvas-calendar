import React, { useEffect, useState } from 'react';
import { format, isSameMonth, isToday, isWeekend } from 'date-fns';
import { cn } from '@/lib/utils';
import { CalendarDay } from './CalendarDay';
import { ViewMode, Platform, PostStatus, SocialPost } from '../SocialCalendar';
import { supabase } from '@/integrations/supabase/client';

interface CalendarGridProps {
  dates: Date[];
  viewMode: ViewMode;
  currentDate: Date;
  selectedPlatforms: Platform[];
  selectedStatuses: PostStatus[];
  onDateClick: (date: Date) => void;
  onPostClick: (post: SocialPost) => void;
}

export const CalendarGrid: React.FC<CalendarGridProps> = ({
  dates,
  viewMode,
  currentDate,
  selectedPlatforms,
  selectedStatuses,
  onDateClick,
  onPostClick,
}) => {
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPosts = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('social_media_posts')
          .select('*')
          .order('scheduled_date', { ascending: true });

        if (error) {
          console.error('Error fetching posts:', error);
        } else {
          setPosts((data as SocialPost[]) || []);
        }
      } catch (error) {
        console.error('Error fetching posts:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, []);

  const getFilteredPostsForDate = (date: Date) => {
    return posts.filter(post => {
      const postDate = new Date(post.scheduled_date);
      const isSameDay = format(postDate, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd');
      const isPlatformSelected = selectedPlatforms.includes(post.platform);
      const isStatusSelected = selectedStatuses.includes(post.status);
      
      return isSameDay && isPlatformSelected && isStatusSelected;
    });
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-muted-foreground">Loading calendar...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0 bg-background">
      {/* Day headers */}
      <div className={cn(
        "grid border-b border-calendar-grid bg-muted/50 flex-shrink-0",
        viewMode === 'month' ? "grid-cols-7" : "grid-cols-7"
      )}>
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
          <div
            key={day}
            className="p-3 text-center text-sm font-medium text-muted-foreground border-r border-calendar-grid last:border-r-0"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="flex-1 min-h-0">
        <div 
          className={cn(
            "grid h-full",
            viewMode === 'month' ? "grid-cols-7" : "grid-cols-7"
          )}
          style={{
            gridTemplateRows: viewMode === 'month' ? 'repeat(6, 1fr)' : '1fr'
          }}
        >
          {dates.map((date, index) => {
            const dayPosts = getFilteredPostsForDate(date);
            
            return (
              <CalendarDay
                key={index}
                date={date}
                posts={dayPosts}
                isCurrentMonth={isSameMonth(date, currentDate)}
                isToday={isToday(date)}
                isWeekend={isWeekend(date)}
                onClick={() => onDateClick(date)}
                onPostClick={onPostClick}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
};