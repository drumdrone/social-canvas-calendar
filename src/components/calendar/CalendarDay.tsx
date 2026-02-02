import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { SocialPost } from '../SocialCalendar';
import { Facebook, Instagram, Twitter, Linkedin, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { getImageUrl } from '@/lib/imageUtils';

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
  const [authorData, setAuthorData] = useState<{ [key: string]: { initials: string; color: string } }>({});
  
  useEffect(() => {
    const fetchAuthorData = async () => {
      const authors = new Set(posts.map(post => post.author).filter(Boolean));
      if (authors.size === 0) return;
      
      try {
        const { data, error } = await supabase
          .from('authors')
          .select('initials, color')
          .in('initials', Array.from(authors));
        
        if (data) {
          const authorMap = data.reduce((acc, author) => {
            acc[author.initials] = author;
            return acc;
          }, {} as { [key: string]: { initials: string; color: string } });
          setAuthorData(authorMap);
        }
      } catch (error) {
        console.error('Error fetching author data:', error);
      }
    };

    fetchAuthorData();
  }, [posts]);
  
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
  
  const handlePostClick = (e: React.MouseEvent, post: SocialPost) => {
    e.stopPropagation(); // Prevent day click when clicking on post
    onPostClick(post);
  };

  const handleDayClick = () => {
    onClick();
  };

  const handleCopyLink = (e: React.MouseEvent, post: SocialPost) => {
    e.stopPropagation();
    const shareableUrl = `${window.location.origin}/post/${post.id}`;
    navigator.clipboard.writeText(shareableUrl);
    toast.success('Share link copied to clipboard!');
  };

  return (
    <div
      className={cn(
        "h-full border-r border-b border-calendar-grid cursor-pointer transition-colors hover:bg-calendar-hover relative overflow-hidden flex flex-col",
        !isCurrentMonth && "text-muted-foreground bg-muted/30",
        isCurrentMonth && monthBg,
        isWeekend && isCurrentMonth && "bg-opacity-60",
        isToday && "border-calendar-today border-2"
      )}
      onClick={handleDayClick}
      style={{ minHeight: 'calc((100vh - 120px) / 4.5)' }}
    >
      {/* Two Row Layout */}
      <div className="h-full flex flex-col">
        {/* First Row - Date and Image/Primary Post */}
        <div className="h-[90%] relative overflow-hidden border-b border-muted/30">
          {hasImage && firstImagePost?.image_url ? (
            <div
              className="h-full relative cursor-pointer hover:opacity-90 transition-opacity"
              onClick={(e) => handlePostClick(e, firstImagePost)}
            >
              <img
                src={getImageUrl(firstImagePost.image_url) || '/placeholder.svg'}
                alt="Post image"
                className="w-full h-[90%] object-cover object-center"
                onMouseEnter={(e) => {
                  if ((firstImagePost as any).comments) {
                    e.currentTarget.title = (firstImagePost as any).comments;
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.removeAttribute('title');
                }}
                onError={(e) => {
                  // If image fails to load, show placeholder
                  if (e.currentTarget.src !== '/placeholder.svg') {
                    e.currentTarget.src = '/placeholder.svg';
                  }
                }}
              />
              
              {/* Title overlay on image - always visible */}
              <div className="absolute bottom-0 left-0 right-0 bg-black/70 backdrop-blur-sm text-white p-2">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold truncate">
                      {firstImagePost.title}
                    </div>
                    {firstImagePost.content && (
                      <div className="text-xs opacity-80 truncate mt-1">
                        {firstImagePost.content}
                      </div>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => handleCopyLink(e, firstImagePost)}
                    className="h-5 w-5 p-0 hover:bg-white/20 text-white hover:text-white ml-1 flex-shrink-0"
                  >
                    <Share2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              
              {/* Author badge overlay - top right */}
              {firstImagePost.author && authorData[firstImagePost.author] && (
                <div className="absolute top-2 right-2">
                  <div 
                    className="rounded-full w-8 h-8 flex items-center justify-center text-white font-bold text-sm shadow-lg p-1"
                    style={{ backgroundColor: authorData[firstImagePost.author].color }}
                  >
                    {authorData[firstImagePost.author].initials.slice(0, 3)}
                  </div>
                </div>
              )}
              
              {/* Platform icon */}
              {platformIcons[firstImagePost.platform as keyof typeof platformIcons] && (
                <div className="absolute bottom-1 right-1">
                  {(() => {
                    const Icon = platformIcons[firstImagePost.platform as keyof typeof platformIcons] || Facebook;
                    const platformColors: Record<string, string> = {
                      facebook: "text-[#1877F2]",
                      instagram: "text-[#E4405F]",
                      twitter: "text-[#1DA1F2]",
                      linkedin: "text-[#0077B5]",
                    };
                    return (
                      <div className="bg-white/90 backdrop-blur-sm rounded-full p-1 shadow-sm">
                        <Icon className={cn("w-3 h-3", platformColors[firstImagePost.platform] || "text-gray-500")} />
                      </div>
                    );
                  })()}
                </div>
              )}
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
            </div>
          ) : (
            <div className="h-full p-2 flex flex-col justify-center">
              <div className="flex items-center justify-between mb-1">
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
              {posts.length > 0 && (
                <div 
                  className="cursor-pointer hover:bg-muted/20 rounded p-1 -m-1 transition-colors"
                  onClick={(e) => handlePostClick(e, posts[0])}
                  title={(posts[0] as any).comments || ''}
                >
                  <div className="flex items-center justify-between relative">
                    <div className="flex-1 min-w-0 pr-8">
                      <div className="text-xs font-medium truncate mb-1">
                        {posts[0].title}
                      </div>
                      {posts[0].content && (
                        <div className="text-xs text-muted-foreground truncate">
                          {posts[0].content}
                        </div>
                      )}
                    </div>
                    {/* Author badge for non-image posts */}
                    {posts[0].author && authorData[posts[0].author] && (
                      <div className="absolute top-0 right-0">
                        <div 
                          className="rounded-full w-7 h-7 flex items-center justify-center text-white font-bold text-xs shadow-md p-1"
                          style={{ backgroundColor: authorData[posts[0].author].color }}
                        >
                          {authorData[posts[0].author].initials.slice(0, 3)}
                        </div>
                      </div>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => handleCopyLink(e, posts[0])}
                      className="h-4 w-4 p-0 hover:bg-muted/40 ml-1 flex-shrink-0"
                    >
                      <Share2 className="h-2.5 w-2.5" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Second Row - Additional Posts or Content */}
        <div className="h-[10%] p-1 flex flex-col justify-start overflow-hidden">
          {posts.length > 1 ? (
            <div className="space-y-1">
               {posts.slice(1, 3).map((post, index) => (
                <div 
                  key={index}
                  className="cursor-pointer hover:bg-muted/20 rounded p-1 -m-1 transition-colors"
                  onClick={(e) => handlePostClick(e, post)}
                  title={(post as any).comments || ''}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium truncate">
                        {post.title}
                      </div>
                      {post.content && (
                        <div className="text-xs text-muted-foreground truncate">
                          {post.content}
                        </div>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => handleCopyLink(e, post)}
                      className="h-4 w-4 p-0 hover:bg-muted/40 ml-1 flex-shrink-0"
                    >
                      <Share2 className="h-2.5 w-2.5" />
                    </Button>
                  </div>
                </div>
              ))}
              {posts.length > 3 && (
                <div className="text-xs text-muted-foreground text-center">
                  +{posts.length - 3} more
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-xs text-muted-foreground text-center">
                Click to add
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};