import React, { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { SocialPost } from '../SocialCalendar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { useRightSidebar } from '@/contexts/RightSidebarContext';
import { cn } from '@/lib/utils';
import { getImageUrl, PLACEHOLDER_URL } from '@/lib/imageUtils';

interface MonthlyPosts {
  month: Date;
  posts: SocialPost[];
}

export const RightCalendarSidebar: React.FC = () => {
  const { isOpen, close } = useRightSidebar();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [monthlyPosts, setMonthlyPosts] = useState<MonthlyPosts[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPosts = async () => {
    setLoading(true);

    // Fetch posts for 3 months (current + 1 before + 1 after)
    const startDate = startOfMonth(subMonths(currentDate, 1));
    const endDate = endOfMonth(addMonths(currentDate, 1));

    const { data, error } = await supabase
      .from('social_media_posts')
      .select('*')
      .gte('scheduled_date', startDate.toISOString())
      .lte('scheduled_date', endDate.toISOString())
      .order('scheduled_date', { ascending: true });

    if (!error && data) {
      // Group posts by month
      const grouped: { [key: string]: SocialPost[] } = {};

      data.forEach((post) => {
        const postDate = new Date(post.scheduled_date);
        const monthKey = format(postDate, 'yyyy-MM');

        if (!grouped[monthKey]) {
          grouped[monthKey] = [];
        }
        grouped[monthKey].push(post as SocialPost);
      });

      // Convert to array of MonthlyPosts
      const monthsWithPosts: MonthlyPosts[] = Object.keys(grouped)
        .sort()
        .map((monthKey) => ({
          month: new Date(monthKey + '-01'),
          posts: grouped[monthKey],
        }));

      setMonthlyPosts(monthsWithPosts);
    }

    setLoading(false);
  };

  useEffect(() => {
    if (isOpen) {
      fetchPosts();
    }
  }, [isOpen, currentDate]);

  const goToPreviousMonth = () => {
    setCurrentDate(prev => subMonths(prev, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(prev => addMonths(prev, 1));
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className={cn(
          "fixed inset-0 bg-black/50 z-40 transition-opacity duration-300",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={close}
      />

      {/* Sidebar */}
      <div
        className={cn(
          "fixed top-0 right-0 h-full w-[350px] bg-background border-l border-border shadow-2xl z-50 transition-transform duration-300",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={goToPreviousMonth}
                className="h-8 w-8"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <h2 className="text-lg font-semibold">
                {format(currentDate, 'MMM yyyy')}
              </h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={goToNextMonth}
                className="h-8 w-8"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={close}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
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
              <div className="p-3 space-y-4">
                {monthlyPosts.map(({ month, posts }) => (
                  <div key={format(month, 'yyyy-MM')} className="space-y-2">
                    <div className="flex items-center justify-between px-1">
                      <h3 className="text-sm font-medium text-muted-foreground">
                        {format(month, 'MMMM yyyy')}
                      </h3>
                      <span className="text-xs text-muted-foreground">
                        {posts.length}
                      </span>
                    </div>

                    <div className="space-y-2">
                      {posts.map((post) => (
                        <div
                          key={post.id}
                          className="flex items-start gap-2 p-2 bg-card border border-border rounded-md hover:bg-muted/50 transition-colors cursor-pointer"
                          onClick={() => {
                            // TODO: Navigate to post or open detail
                            console.log('Post clicked:', post.id);
                          }}
                        >
                          <div className="flex flex-col items-center justify-center min-w-[40px] text-center flex-shrink-0">
                            <div className="text-sm font-bold text-foreground">
                              {format(new Date(post.scheduled_date), 'd')}
                            </div>
                            <div className="text-[10px] text-muted-foreground">
                              {format(new Date(post.scheduled_date), 'MMM')}
                            </div>
                          </div>

                          {post.image_url && (
                            <img
                              src={getImageUrl(post.image_url) || PLACEHOLDER_URL}
                              alt="Post thumbnail"
                              className="w-12 h-12 rounded object-cover border flex-shrink-0"
                              onError={(e) => {
                                // If image fails to load, show placeholder
                                if (e.currentTarget.src !== PLACEHOLDER_URL) {
                                  e.currentTarget.src = PLACEHOLDER_URL;
                                }
                              }}
                            />
                          )}

                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-medium text-foreground truncate">
                              {post.title}
                            </h4>
                            {post.content && (
                              <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                                {post.content}
                              </p>
                            )}
                            <div className="flex items-center gap-1 mt-1">
                              <span className="text-[10px] text-muted-foreground">
                                {format(new Date(post.scheduled_date), 'HH:mm')}
                              </span>
                              <span className="text-[10px] text-muted-foreground">•</span>
                              <span className="text-[10px] text-muted-foreground capitalize">
                                {post.platform}
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
    </>
  );
};
