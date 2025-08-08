import React, { useEffect, useState } from 'react';
import { Heart, MessageCircle, Share } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { SocialPost, Platform, PostStatus } from '../SocialCalendar';
import { supabase } from '@/integrations/supabase/client';

interface FacebookPostPreviewProps {
  selectedPlatforms: Platform[];
  selectedStatuses: PostStatus[];
}

export const FacebookPostPreview: React.FC<FacebookPostPreviewProps> = ({
  selectedPlatforms,
  selectedStatuses,
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

  const filteredPosts = posts.filter(post => {
    const isPlatformSelected = selectedPlatforms.includes(post.platform);
    const isStatusSelected = selectedStatuses.includes(post.status);
    return isPlatformSelected && isStatusSelected;
  });

  // Get the first post with content or fallback to first post
  const featuredPost = filteredPosts.find(post => post.title && post.content) || filteredPosts[0];

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-muted-foreground">Loading preview...</div>
      </div>
    );
  }

  if (!featuredPost) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-muted-foreground">No posts available for preview</div>
      </div>
    );
  }

  // Sample data for Facebook UI elements
  const sampleData = {
    companyName: "Green Apotheke",
    timestamp: "31. červenec v 19:01",
    likes: Math.floor(Math.random() * 50) + 1,
    comments: Math.floor(Math.random() * 10) + 1,
    shares: Math.floor(Math.random() * 5),
  };

  return (
    <div className="flex-1 flex items-center justify-center p-6 bg-muted/50">
      <Card className="w-full max-w-lg shadow-lg">
        <CardContent className="p-0">
          {/* Facebook Post Header */}
          <div className="flex items-center gap-3 p-4 border-b">
            <Avatar className="w-10 h-10">
              <AvatarImage src="/lovable-uploads/45fc31c8-75e9-443d-b12f-6762de02ab90.png" />
              <AvatarFallback className="bg-primary text-primary-foreground">GA</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="font-semibold text-sm">{sampleData.companyName}</div>
              <div className="text-xs text-muted-foreground">{sampleData.timestamp}</div>
            </div>
            <Button variant="ghost" size="sm" className="text-muted-foreground">
              •••
            </Button>
          </div>

          {/* Post Content */}
          <div className="p-4">
            <div className="space-y-3">
              {featuredPost.title && (
                <h3 className="font-semibold text-sm">{featuredPost.title}</h3>
              )}
              {featuredPost.content && (
                <p className="text-sm text-foreground leading-relaxed">
                  {featuredPost.content}
                  {featuredPost.content.length > 150 && (
                    <span className="text-primary ml-1 cursor-pointer">... Zobrazit víc</span>
                  )}
                </p>
              )}
            </div>
          </div>

          {/* Post Image */}
          {featuredPost.image_url && (
            <div className="relative">
              <img
                src={featuredPost.image_url}
                alt={featuredPost.title || "Post image"}
                className="w-full h-64 object-cover"
              />
            </div>
          )}

          {/* Engagement Stats */}
          <div className="px-4 py-3 border-t border-b">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                  <Heart className="w-2.5 h-2.5 text-white fill-current" />
                </div>
                <span>{sampleData.likes}</span>
              </div>
              <div className="flex gap-4">
                <span>{sampleData.comments} komentář{sampleData.comments !== 1 ? 'ů' : ''}</span>
                {sampleData.shares > 0 && (
                  <span>{sampleData.shares} sdílení</span>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center border-t">
            <Button variant="ghost" className="flex-1 gap-2 py-3 text-muted-foreground hover:bg-muted/50 rounded-none">
              <Heart className="w-4 h-4" />
              To se mi líbí
            </Button>
            <Button variant="ghost" className="flex-1 gap-2 py-3 text-muted-foreground hover:bg-muted/50 rounded-none border-l border-r">
              <MessageCircle className="w-4 h-4" />
              Komentář
            </Button>
            <Button variant="ghost" className="flex-1 gap-2 py-3 text-muted-foreground hover:bg-muted/50 rounded-none">
              <Share className="w-4 h-4" />
              Sdílet
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};