
import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfYear, endOfYear, eachWeekOfInterval, startOfWeek, endOfWeek, getMonth, getWeek } from 'date-fns';

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
  author?: string;
}

interface AuthorStats {
  author: string;
  initials: string;
  color: string;
  count: number;
  posts: SocialPost[];
}

interface MatrixGridProps {
  currentYear: number;
}

const monthNames = [
  'LEDEN', 'ÚNOR', 'BŘEZEN', 'DUBEN', 'KVĚTEN', 'ČERVEN',
  'ČERVENEC', 'SRPEN', 'ZÁŘÍ', 'ŘÍJEN', 'LISTOPAD', 'PROSINEC'
];

export const MatrixGrid: React.FC<MatrixGridProps> = ({ currentYear }) => {
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [authorsData, setAuthorsData] = useState<Record<string, { initials: string; color: string }>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchYearData();
  }, [currentYear]);

  const fetchYearData = async () => {
    setLoading(true);
    try {
      const startDate = startOfYear(new Date(currentYear, 0, 1));
      const endDate = endOfYear(new Date(currentYear, 0, 1));
      
      const { data, error } = await supabase
        .from('social_media_posts')
        .select('*')
        .gte('scheduled_date', startDate.toISOString())
        .lte('scheduled_date', endDate.toISOString())
        .order('scheduled_date', { ascending: true });

      if (error) throw error;
      setPosts(data || []);

      // Fetch authors data
      const authorInitials = data?.map(post => post.author).filter(Boolean) || [];
      if (authorInitials.length > 0) {
        const { data: authorsData, error: authorsError } = await supabase
          .from('authors')
          .select('initials, color')
          .in('initials', authorInitials);
        
        if (authorsData) {
          const authorsMap = authorsData.reduce((acc, author) => {
            acc[author.initials] = author;
            return acc;
          }, {} as Record<string, { initials: string; color: string }>);
          setAuthorsData(authorsMap);
        }
      }
    } catch (error) {
      console.error('Error fetching year data:', error);
    }
    setLoading(false);
  };

  const getWeeksInYear = () => {
    const startDate = startOfYear(new Date(currentYear, 0, 1));
    const endDate = endOfYear(new Date(currentYear, 0, 1));
    
    return eachWeekOfInterval({
      start: startDate,
      end: endDate
    });
  };

  const getAuthorStatsForMonthWeek = (monthIndex: number, weekIndex: number): AuthorStats[] => {
    const weeks = getWeeksInYear();
    const targetWeek = weeks[weekIndex];
    
    if (!targetWeek) return [];

    const weekStart = startOfWeek(targetWeek);
    const weekEnd = endOfWeek(targetWeek);

    const weekPosts = posts.filter(post => {
      const postDate = new Date(post.scheduled_date);
      const postMonth = getMonth(postDate);
      return postMonth === monthIndex && 
             postDate >= weekStart && 
             postDate <= weekEnd &&
             post.author;
    });

    // Group by author
    const authorGroups = weekPosts.reduce((acc, post) => {
      const author = post.author!;
      if (!acc[author]) {
        acc[author] = [];
      }
      acc[author].push(post);
      return acc;
    }, {} as Record<string, SocialPost[]>);

    // Convert to AuthorStats
    return Object.entries(authorGroups).map(([author, posts]) => ({
      author,
      initials: authorsData[author]?.initials || author.substring(0, 3).toUpperCase(),
      color: authorsData[author]?.color || '#3B82F6',
      count: posts.length,
      posts
    }));
  };

  const weeks = getWeeksInYear();
  const maxWeeks = 53; // Maximum possible weeks in a year

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-muted-foreground">Loading matrix...</div>
      </div>
    );
  }

  return (
    <Card className="flex-1 overflow-hidden">
      <div className="h-full overflow-auto">
        <div className="min-w-max">
          {/* Header row with week numbers */}
          <div className="flex sticky top-0 bg-muted z-10">
            <div className="w-24 p-2 border-r border-border bg-muted">
              <div className="text-xs font-medium text-center">Month</div>
            </div>
            {Array.from({ length: maxWeeks }, (_, i) => (
              <div key={i} className="w-16 p-2 border-r border-border text-center">
                <div className="text-xs font-medium">
                  {i < weeks.length ? `W${getWeek(weeks[i])}` : ''}
                </div>
              </div>
            ))}
          </div>

          {/* Month rows */}
          {monthNames.map((monthName, monthIndex) => (
            <div key={monthIndex} className="flex border-b border-border">
              <div className="w-24 p-2 border-r border-border bg-muted/30 flex items-center">
                <div className="text-xs font-medium text-center w-full">
                  {monthName}
                </div>
              </div>
              {Array.from({ length: maxWeeks }, (_, weekIndex) => {
                const authorStats = getAuthorStatsForMonthWeek(monthIndex, weekIndex);
                
                return (
                  <div key={weekIndex} className="w-16 p-1 border-r border-border min-h-[60px] relative">
                    <div className="flex flex-wrap gap-1">
                      {authorStats.map((stat, statIndex) => (
                        <div
                          key={`${stat.author}-${statIndex}`}
                          className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[8px] font-bold relative"
                          style={{ backgroundColor: stat.color }}
                          title={`${stat.author}: ${stat.count} posts`}
                        >
                          {stat.initials}
                          {stat.count > 1 && (
                            <div className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full text-[6px] text-primary-foreground flex items-center justify-center">
                              {stat.count}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
};
