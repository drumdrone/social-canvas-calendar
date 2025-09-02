
import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfYear, endOfYear, eachWeekOfInterval, startOfWeek, endOfWeek, getMonth, getWeek, startOfQuarter, endOfQuarter } from 'date-fns';

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
  currentQuarter: number;
}

const monthNames = [
  'LEDEN', 'ÚNOR', 'BŘEZEN', 'DUBEN', 'KVĚTEN', 'ČERVEN',
  'ČERVENEC', 'SRPEN', 'ZÁŘÍ', 'ŘÍJEN', 'LISTOPAD', 'PROSINEC'
];

const statusAbbreviations: Record<string, string> = {
  'published': 'PUB',
  'draft': 'DRA',
  'scheduled': 'SCH',
  'pending': 'PEN',
  'review': 'REV'
};

export const MatrixGrid: React.FC<MatrixGridProps> = ({ currentYear, currentQuarter }) => {
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [authorsData, setAuthorsData] = useState<Record<string, { initials: string; color: string }>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchQuarterData();
  }, [currentYear, currentQuarter]);

  const fetchQuarterData = async () => {
    setLoading(true);
    try {
      const quarterStartMonth = (currentQuarter - 1) * 3;
      const startDate = startOfQuarter(new Date(currentYear, quarterStartMonth, 1));
      const endDate = endOfQuarter(new Date(currentYear, quarterStartMonth, 1));
      
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
      console.error('Error fetching quarter data:', error);
    }
    setLoading(false);
  };

  const getWeeksInQuarter = () => {
    const quarterStartMonth = (currentQuarter - 1) * 3;
    const startDate = startOfQuarter(new Date(currentYear, quarterStartMonth, 1));
    const endDate = endOfQuarter(new Date(currentYear, quarterStartMonth, 1));
    
    return eachWeekOfInterval({
      start: startDate,
      end: endDate
    });
  };

  const getQuarterMonths = () => {
    const startMonth = (currentQuarter - 1) * 3;
    return [startMonth, startMonth + 1, startMonth + 2];
  };

  const getPostsForMonthWeek = (monthIndex: number, weekIndex: number): SocialPost[] => {
    const weeks = getWeeksInQuarter();
    const targetWeek = weeks[weekIndex];
    
    if (!targetWeek) return [];

    const weekStart = startOfWeek(targetWeek);
    const weekEnd = endOfWeek(targetWeek);

    return posts.filter(post => {
      const postDate = new Date(post.scheduled_date);
      const postMonth = getMonth(postDate);
      return postMonth === monthIndex && 
             postDate >= weekStart && 
             postDate <= weekEnd;
    });
  };

  const weeks = getWeeksInQuarter();
  const quarterMonths = getQuarterMonths();

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
            <div className="w-32 p-3 border-r border-border bg-muted">
              <div className="text-sm font-medium text-center">Month</div>
            </div>
            {weeks.map((week, weekIndex) => (
              <div key={weekIndex} className="w-48 p-3 border-r border-border text-center">
                <div className="text-sm font-medium">
                  Week {getWeek(week)}
                </div>
              </div>
            ))}
          </div>

          {/* Quarter Month rows */}
          {quarterMonths.map((monthIndex) => (
            <div key={monthIndex} className="flex border-b border-border">
              <div className="w-32 p-3 border-r border-border bg-muted/30 flex items-center">
                <div className="text-sm font-medium text-center w-full">
                  {monthNames[monthIndex]}
                </div>
              </div>
              {weeks.map((_, weekIndex) => {
                const weekPosts = getPostsForMonthWeek(monthIndex, weekIndex);
                
                // Group posts by author and status
                const authors = [...new Set(weekPosts.map(p => p.author).filter(Boolean))];
                const statusCounts = weekPosts.reduce((acc, post) => {
                  const status = statusAbbreviations[post.status] || post.status.substring(0, 3).toUpperCase();
                  acc[status] = (acc[status] || 0) + 1;
                  return acc;
                }, {} as Record<string, number>);
                
                return (
                  <div key={weekIndex} className="w-48 p-2 border-r border-border min-h-[120px] bg-background">
                    <div className="space-y-2">
                      {/* Authors row */}
                      <div className="min-h-[40px]">
                        <div className="text-xs font-medium text-muted-foreground mb-1">AUTHORS</div>
                        <div className="flex flex-wrap gap-1">
                          {authors.map((author, authorIndex) => {
                            const authorData = authorsData[author!];
                            const initials = authorData?.initials || author!.substring(0, 3).toUpperCase();
                            const color = authorData?.color || '#3B82F6';
                            
                            return (
                              <div
                                key={`${author}-${authorIndex}`}
                                className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                                style={{ backgroundColor: color }}
                                title={author}
                              >
                                {initials}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                      
                      {/* Status row */}
                      <div className="min-h-[40px]">
                        <div className="text-xs font-medium text-muted-foreground mb-1">STATUS</div>
                        <div className="flex flex-wrap gap-1">
                          {Object.entries(statusCounts).map(([status, count]) => (
                            <div
                              key={status}
                              className="px-2 py-1 rounded bg-primary/10 text-primary text-xs font-medium"
                              title={`${status}: ${count} posts`}
                            >
                              {status} {count > 1 ? `(${count})` : ''}
                            </div>
                          ))}
                        </div>
                      </div>
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
