import React, { useLayoutEffect, useMemo, useRef } from 'react';
import { format, isSameMonth, isToday, isWeekend } from 'date-fns';
import { cn } from '@/lib/utils';
import { CalendarDay } from './CalendarDay';
import { ViewMode, Platform, PostStatus, SocialPost } from '../SocialCalendar';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { convexToSocialPost } from '@/integrations/convex/adapter';

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
  // Reads posts from Convex. `useQuery` is reactive — when a post is
  // added/edited/deleted anywhere (currently still through Supabase), those
  // writes replicate to Convex during the migration window and this list
  // updates on its own. Loading = query still resolving (data === undefined).
  const raw = useQuery(api.posts.list);
  const posts = useMemo<SocialPost[]>(
    () => (raw ?? []).map(convexToSocialPost),
    [raw],
  );
  const loading = raw === undefined;

  // Scroll the row containing today to the top of the scroll container so the
  // current week is always visible on load. Runs whenever the visible date
  // range changes or the initial post query resolves (which is when the grid
  // cells actually exist in the DOM).
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (loading || viewMode !== 'month') return;
    const container = scrollContainerRef.current;
    if (!container) return;
    const todayEl = container.querySelector<HTMLElement>('[data-today="true"]');
    if (!todayEl) return;
    const containerRect = container.getBoundingClientRect();
    const todayRect = todayEl.getBoundingClientRect();
    container.scrollTop += todayRect.top - containerRect.top;
  }, [dates, viewMode, loading]);

  const getFilteredPostsForDate = (date: Date) => {
    return posts.filter(post => {
      const postDate = new Date(post.scheduled_date);
      const isSameDay = format(postDate, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd');

      if (!isSameDay) return false;

      // If no filters selected, show all posts
      if (selectedPlatforms.length === 0 && selectedStatuses.length === 0) {
        return true;
      }

      // Show posts that match ANY of the selected filters (OR logic)
      const platformMatch = selectedPlatforms.length === 0 || selectedPlatforms.includes(post.platform);
      const statusMatch = selectedStatuses.length === 0 || selectedStatuses.includes(post.status);

      // Post must match at least one filter category if that category has selections
      if (selectedPlatforms.length > 0 && selectedStatuses.length > 0) {
        // Both filters active: match either platform OR status
        return platformMatch || statusMatch;
      }

      // Only one filter active: must match that filter
      return platformMatch && statusMatch;
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
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
          <div
            key={day}
            className="p-3 text-center text-sm font-medium text-muted-foreground border-r border-calendar-grid last:border-r-0"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div ref={scrollContainerRef}
           className="flex-1 min-h-0 overflow-auto scroll-smooth"
           onWheel={(e) => {
             if (e.button === 1 || e.buttons === 4) { // Middle mouse button
               e.preventDefault();
               const container = e.currentTarget;
               container.scrollTop += e.deltaY;
             }
           }}
           onMouseDown={(e) => {
             if (e.button === 1) { // Middle mouse button
               e.preventDefault();
             }
           }}>
        <div 
          className={cn(
            "grid",
            viewMode === 'month' ? "grid-cols-7" : "grid-cols-7"
          )}
          style={{
            gridTemplateRows: viewMode === 'month' ? 'repeat(6, minmax(180px, 1fr))' : 'minmax(180px, 1fr)',
            minHeight: '100%'
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