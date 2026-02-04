import React, { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { SocialPost } from '../SocialCalendar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';

interface MonthlyPosts {
  month: Date;
  posts: SocialPost[];
}

export const RightCalendarSidebar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
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
    fetchPosts();
  }, [currentDate]);

  // Listen for post updates
  useEffect(() => {
    const channel = supabase
      .channel('quick-calendar-posts')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'social_media_posts' }, () => {
        fetchPosts();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentDate]);

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
    <div className="hidden lg:flex w-[300px] flex-shrink-0 border-l border-border bg-background h-screen">
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
            <h2 className="text-sm font-semibold min-w-[100px] text-center">
              {format(currentDate, 'MMM yyyy')}
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
              {monthlyPosts.map(({ month, posts }, index) => (
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
                  <div className="space-y-1 px-2">
                    {posts.map((post) => (
                      <div
                        key={post.id}
                        className="flex items-start gap-2 p-2 bg-card border border-border rounded-md hover:bg-primary/5 hover:border-primary/20 transition-colors cursor-pointer"
                        onClick={() => handlePostClick(post)}
                      >
                        <div className="flex flex-col items-center justify-center min-w-[32px] text-center flex-shrink-0 bg-muted rounded px-1 py-0.5">
                          <div className="text-sm font-bold text-foreground leading-tight">
                            {format(new Date(post.scheduled_date), 'd')}
                          </div>
                          <div className="text-[8px] text-muted-foreground uppercase">
                            {format(new Date(post.scheduled_date), 'MMM')}
                          </div>
                        </div>

                        {post.image_url && (
                          <img
                            src={post.image_url}
                            alt="Post thumbnail"
                            className="w-10 h-10 rounded object-cover border flex-shrink-0"
                          />
                        )}

                        <div className="flex-1 min-w-0">
                          <h4 className="text-xs font-medium text-foreground truncate">
                            {post.title || 'Untitled'}
                          </h4>
                          <div className="flex items-center gap-1 mt-0.5">
                            <span className="text-[9px] text-muted-foreground">
                              {format(new Date(post.scheduled_date), 'HH:mm')}
                            </span>
                            <span className="text-[9px] text-muted-foreground">•</span>
                            <span className="text-[9px] text-muted-foreground capitalize">
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
