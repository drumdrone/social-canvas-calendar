import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfMonth, endOfMonth, eachWeekOfInterval, getWeeksInMonth, getWeek, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns';

interface SocialPost {
  id: string;
  title: string;
  content: string;
  platform: string;
  scheduled_date: string;
  status: string;
  category: string;
  pillar: string;
  product_line: string;
}

const platforms = [
  { name: 'Instagram', color: 'bg-pink-500' },
  { name: 'Facebook', color: 'bg-blue-600' },
  { name: 'Twitter', color: 'bg-blue-400' },
  { name: 'TikTok', color: 'bg-black' },
  { name: 'Pinterest', color: 'bg-red-600' },
  { name: 'LinkedIn', color: 'bg-blue-700' },
  { name: 'Medium', color: 'bg-green-600' }
];

export const MatrixCalendar: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterMonth, setFilterMonth] = useState(format(new Date(), 'yyyy-MM'));

  useEffect(() => {
    fetchPosts();
  }, [filterMonth]);

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const startDate = new Date(filterMonth + '-01');
      const endDate = endOfMonth(startDate);
      
      const { data, error } = await supabase
        .from('social_media_posts')
        .select('*')
        .gte('scheduled_date', startDate.toISOString())
        .lte('scheduled_date', endDate.toISOString())
        .order('scheduled_date', { ascending: true });

      if (error) throw error;
      setPosts(data || []);
    } catch (error) {
      console.error('Error fetching posts:', error);
    }
    setLoading(false);
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (direction === 'prev') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setCurrentDate(newDate);
    setFilterMonth(format(newDate, 'yyyy-MM'));
  };

  const getPostsForDateAndPlatform = (date: Date, platform: string) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return posts.filter(post => 
      format(new Date(post.scheduled_date), 'yyyy-MM-dd') === dateStr && 
      post.platform === platform
    );
  };

  const weeks = eachWeekOfInterval({
    start: startOfMonth(currentDate),
    end: endOfMonth(currentDate)
  });

  const getDaysInWeek = (weekStart: Date) => {
    return eachDayOfInterval({
      start: startOfWeek(weekStart),
      end: endOfWeek(weekStart)
    });
  };

  return (
    <div className="h-full flex flex-col p-6">
      {/* Header with Navigation and Filters */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => navigateMonth('prev')}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-xl font-semibold">
            {format(currentDate, 'MMMM yyyy')}
          </h2>
          <Button variant="outline" size="sm" onClick={() => navigateMonth('next')}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            <Select value={filterMonth} onValueChange={setFilterMonth}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Select month" />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 12 }, (_, i) => {
                  const date = new Date(new Date().getFullYear(), i, 1);
                  const value = format(date, 'yyyy-MM');
                  return (
                    <SelectItem key={value} value={value}>
                      {format(date, 'MMMM yyyy')}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Matrix Grid */}
      <Card className="flex-1 overflow-hidden">
        <div className="h-full overflow-auto">
          <table className="w-full border-collapse">
            <thead className="sticky top-0 bg-muted z-10">
              <tr>
                <th className="border border-border p-2 text-left min-w-[80px] bg-muted">
                  <div className="text-xs font-medium">Week</div>
                </th>
                <th className="border border-border p-2 text-left min-w-[100px] bg-muted">
                  <div className="text-xs font-medium">Day</div>
                </th>
                {platforms.map((platform) => (
                  <th key={platform.name} className="border border-border p-2 text-left min-w-[150px] bg-muted">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded ${platform.color}`} />
                      <span className="text-xs font-medium">{platform.name}</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {weeks.map((weekStart, weekIndex) => {
                const days = getDaysInWeek(weekStart);
                return days.map((day, dayIndex) => {
                  const weekNumber = getWeek(day);
                  const isCurrentMonth = day.getMonth() === currentDate.getMonth();
                  
                  return (
                    <tr key={`${weekIndex}-${dayIndex}`} className={!isCurrentMonth ? 'opacity-50' : ''}>
                      {dayIndex === 0 && (
                        <td 
                          className="border border-border p-2 bg-muted/50 text-center font-medium"
                          rowSpan={7}
                        >
                          <div className="text-sm">CW {weekNumber}</div>
                        </td>
                      )}
                      <td className="border border-border p-2 bg-muted/30">
                        <div className="text-xs font-medium">{format(day, 'EEEE')}</div>
                        <div className="text-lg font-bold">{format(day, 'd')}</div>
                      </td>
                      {platforms.map((platform) => {
                        const dayPosts = getPostsForDateAndPlatform(day, platform.name);
                        return (
                          <td key={platform.name} className="border border-border p-1 align-top">
                            <div className="space-y-1">
                              {dayPosts.map((post) => (
                                <div key={post.id} className="text-xs p-1 bg-background rounded border">
                                  <div className="font-medium truncate">{post.title}</div>
                                  {post.content && (
                                    <div className="text-muted-foreground truncate">
                                      {post.content.substring(0, 50)}...
                                    </div>
                                  )}
                                  <div className="flex items-center gap-1 mt-1">
                                    <Badge variant="secondary" className="text-xs px-1 py-0">
                                      {post.status}
                                    </Badge>
                                    {post.category && (
                                      <Badge variant="outline" className="text-xs px-1 py-0">
                                        {post.category}
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  );
                });
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};