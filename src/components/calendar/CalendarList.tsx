import React, { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { SocialPost, Platform, PostStatus } from '../SocialCalendar';
import { Button } from '@/components/ui/button';
import { Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { PostPreview } from './PostPreview';
import { ScrollArea } from '@/components/ui/scroll-area';

interface CalendarListProps {
  currentDate: Date;
  selectedPlatforms: Platform[];
  selectedStatuses: PostStatus[];
  onDateClick: (date: Date) => void;
  onPostClick: (post: SocialPost) => void;
}

interface MonthlyPosts {
  month: Date;
  posts: SocialPost[];
}

export const CalendarList: React.FC<CalendarListProps> = ({
  currentDate,
  selectedPlatforms,
  selectedStatuses,
  onDateClick,
  onPostClick,
}) => {
  const [monthlyPosts, setMonthlyPosts] = useState<MonthlyPosts[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPostIndex, setCurrentPostIndex] = useState(0);

  const fetchPosts = async () => {
    setLoading(true);
    
    // Fetch posts for the current year (6 months before and after current month)
    const startDate = startOfMonth(subMonths(currentDate, 6));
    const endDate = endOfMonth(addMonths(currentDate, 6));

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

      // Convert to array of MonthlyPosts and sort by month
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

  const filterPosts = (posts: SocialPost[]) => {
    return posts.filter((post) => {
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

  const handleAddPost = (month: Date) => {
    onDateClick(month);
  };

  // Enhanced scroll behavior for posts navigation
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      const allPosts = monthlyPosts.flatMap(month => filterPosts(month.posts));
      if (allPosts.length === 0) return;

      e.preventDefault();
      
      if (e.deltaY > 0) {
        // Scroll down - go to next post
        setCurrentPostIndex(prev => Math.min(prev + 1, allPosts.length - 1));
      } else {
        // Scroll up - go to previous post
        setCurrentPostIndex(prev => Math.max(prev - 1, 0));
      }

      // Scroll the selected post into view
      setTimeout(() => {
        const postElement = document.querySelector(`[data-post-index="${currentPostIndex}"]`);
        if (postElement) {
          postElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
    };

    const scrollArea = document.querySelector('.calendar-list-scroll');
    if (scrollArea) {
      scrollArea.addEventListener('wheel', handleWheel, { passive: false });
      return () => scrollArea.removeEventListener('wheel', handleWheel);
    }
  }, [monthlyPosts, currentPostIndex]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-muted-foreground">Loading posts...</div>
      </div>
    );
  }

  // Track post index across all months for scroll navigation
  let globalPostIndex = 0;

  return (
    <div className="flex-1 overflow-hidden">
      <ScrollArea className="h-[calc(100vh-120px)] calendar-list-scroll">
        <div className="p-6">
          <div className="max-w-4xl mx-auto space-y-8">
            {monthlyPosts.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-muted-foreground mb-4">No posts found for this period</div>
                <Button onClick={() => handleAddPost(currentDate)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Post
                </Button>
              </div>
            ) : (
              monthlyPosts.map(({ month, posts }) => {
                const filteredPosts = filterPosts(posts);
                
                if (filteredPosts.length === 0) return null;
                
                return (
                  <div key={format(month, 'yyyy-MM')} className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h2 className="text-xl font-semibold text-foreground">
                        {format(month, 'MMMM yyyy')}
                      </h2>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">
                          {filteredPosts.length} post{filteredPosts.length !== 1 ? 's' : ''}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleAddPost(month)}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Add Post
                        </Button>
                      </div>
                    </div>
                    
                    <div className="grid gap-3">
                      {filteredPosts.map((post) => {
                        const thisPostIndex = globalPostIndex++;
                        return (
                          <div 
                            key={post.id} 
                            data-post-index={thisPostIndex}
                            className={`flex items-center gap-4 p-4 bg-card border border-border rounded-lg hover:bg-muted/50 transition-all duration-200 ${
                              thisPostIndex === currentPostIndex ? 'ring-2 ring-primary shadow-lg scale-[1.02]' : ''
                            }`}
                          >
                            <div className="flex flex-col items-center justify-center min-w-[80px] text-center">
                              <div className="text-lg font-bold text-foreground">
                                {format(new Date(post.scheduled_date), 'd')}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {format(new Date(post.scheduled_date), 'MMM')}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {format(new Date(post.scheduled_date), 'HH:mm')}
                              </div>
                            </div>
                            
                            {post.image_url && (
                              <img
                                src={post.image_url}
                                alt="Post thumbnail"
                                className="w-16 h-16 rounded-md object-cover border cursor-pointer"
                                onMouseEnter={(e) => {
                                  if ((post as any).comments) {
                                    e.currentTarget.title = (post as any).comments;
                                  }
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.removeAttribute('title');
                                }}
                              />
                            )}
                            
                            <div className="flex-1 min-w-0">
                              <h3 
                                className="font-medium text-foreground truncate mb-1 cursor-pointer hover:text-primary transition-colors"
                                onClick={() => onPostClick(post)}
                              >
                                {post.title}
                              </h3>
                            
                              {post.content && (
                                <p className="text-sm text-muted-foreground line-clamp-2">
                                  {post.content}
                                </p>
                              )}
                            </div>
                            
                            <div className="flex-shrink-0">
                              <PostPreview 
                                post={post} 
                                onClick={() => onPostClick(post)}
                                compact
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
};