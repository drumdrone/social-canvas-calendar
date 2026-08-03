import React, { useState, useEffect, useMemo } from 'react';
import { format, startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { convexToSocialPost } from '@/integrations/convex/adapter';
import { SocialPost } from '../SocialCalendar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';

interface MonthlyPosts {
  month: Date;
  posts: SocialPost[];
}

export const RightCalendarSidebar: React.FC = () => {
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());

  // Reactive status colors from Convex.
  const statusesQ = useQuery(api.taxonomy.listStatuses);
  const statusColors = useMemo<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    for (const s of statusesQ ?? []) {
      if ((s as any).isActive === false) continue;
      map[(s as any).name] = (s as any).color;
    }
    return map;
  }, [statusesQ]);

  // Reactive Convex read replaces the manual fetchPosts + realtime channel
  // + custom "postsChanged" event listener. Window: current month + next 2.
  const raw = useQuery(api.posts.list);
  const loading = raw === undefined;
  const monthlyPosts = useMemo<MonthlyPosts[]>(() => {
    if (!raw) return [];
    const startDate = startOfMonth(currentDate);
    const endDate = endOfMonth(addMonths(currentDate, 2));
    const grouped: { [key: string]: SocialPost[] } = {};
    for (const doc of raw) {
      const post = convexToSocialPost(doc);
      if (!post.scheduled_date) continue;
      const postDate = new Date(post.scheduled_date);
      if (postDate < startDate || postDate > endDate) continue;
      const monthKey = format(postDate, 'yyyy-MM');
      (grouped[monthKey] ||= []).push(post);
    }
    for (const key of Object.keys(grouped)) {
      grouped[key].sort(
        (a, b) => new Date(a.scheduled_date).getTime() - new Date(b.scheduled_date).getTime(),
      );
    }
    return Object.keys(grouped)
      .sort()
      .map((monthKey) => ({ month: new Date(monthKey + '-01'), posts: grouped[monthKey] }));
  }, [raw, currentDate]);

  const goToPreviousMonth = () => {
    setCurrentDate(prev => subMonths(prev, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(prev => addMonths(prev, 1));
  };

  const handlePostClick = (post: SocialPost) => {
    // Navigate to calendar with edit parameter
    navigate(`/calendar?edit=${post.id}`);
  };

  return (
    <div className="hidden lg:flex w-[350px] flex-shrink-0 border-l border-border bg-background h-screen">
      <div className="flex flex-col h-full w-full">
        {/* Header */}
        <div className="flex items-center justify-center p-3 border-b border-border bg-muted/30">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={goToPreviousMonth}
              className="h-7 w-7"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h2 className="text-sm font-semibold min-w-[120px] text-center">
              {format(currentDate, 'MMMM yyyy')}
            </h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={goToNextMonth}
              className="h-7 w-7"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <ScrollArea className="flex-1">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="text-sm text-muted-foreground">Loading...</div>
            </div>
          ) : monthlyPosts.length === 0 ? (
            <div className="flex items-center justify-center h-32 px-4">
              <div className="text-sm text-muted-foreground text-center">
                No posts for this period
              </div>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {monthlyPosts.map(({ month, posts }) => (
                <div key={format(month, 'yyyy-MM')} className="py-3">
                  {/* Month Header */}
                  <div className="flex items-center justify-between px-3 mb-2">
                    <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">
                      {format(month, 'MMMM yyyy')}
                    </h3>
                    <span className="text-xs font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                      {posts.length}
                    </span>
                  </div>

                  {/* Posts */}
                  <div className="space-y-1.5 px-2">
                    {posts.map((post) => (
                      <div
                        key={post.id}
                        className="flex items-start gap-3 p-2 bg-card border border-border rounded-md hover:bg-primary/5 hover:border-primary/20 transition-colors cursor-pointer"
                        onClick={() => handlePostClick(post)}
                      >
                        <div className="flex flex-col items-center justify-center min-w-[36px] text-center flex-shrink-0 bg-muted rounded px-1.5 py-1">
                          <div className="text-sm font-bold text-foreground leading-tight">
                            {format(new Date(post.scheduled_date), 'd')}
                          </div>
                          <div className="text-[8px] text-muted-foreground uppercase">
                            {format(new Date(post.scheduled_date), 'MMM')}
                          </div>
                        </div>

                        {(post.image_url_1 || post.image_url) && (
                          <img
                            src={post.image_url_1 || post.image_url}
                            alt="Post thumbnail"
                            className="w-12 h-12 rounded object-cover border flex-shrink-0"
                          />
                        )}

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span
                              className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0"
                              style={{ backgroundColor: statusColors[post.status] || '#6B7280' }}
                              title={post.status || 'unknown'}
                            />
                            <h4 className="text-sm font-medium text-foreground truncate">
                              {post.title || 'Untitled'}
                            </h4>
                          </div>
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className="text-[10px] text-muted-foreground">
                              {format(new Date(post.scheduled_date), 'HH:mm')}
                            </span>
                            <span className="text-[10px] text-muted-foreground">•</span>
                            <span className="text-[10px] text-muted-foreground capitalize">
                              {post.platform || 'No platform'}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  );
};
