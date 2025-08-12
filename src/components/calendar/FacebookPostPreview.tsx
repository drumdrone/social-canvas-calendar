import React, { useEffect, useState } from 'react';
import { Heart, MessageCircle, Share, MoreHorizontal } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { SocialPost, Platform, PostStatus } from '../SocialCalendar';
import { supabase } from '@/integrations/supabase/client';
import { PostModal } from './PostModal';
import { ScrollArea } from '@/components/ui/scroll-area';

interface FacebookPostPreviewProps {
  selectedPlatforms: Platform[];
  selectedStatuses: PostStatus[];
  currentDate: Date;
}

export const FacebookPostPreview: React.FC<FacebookPostPreviewProps> = ({
  selectedPlatforms,
  selectedStatuses,
  currentDate,
}) => {
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<SocialPost | null>(null);

  useEffect(() => {
    const fetchPosts = async () => {
      setLoading(true);
      try {
        // Calculate week range from currentDate
        const startOfWeek = new Date(currentDate);
        startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
        startOfWeek.setHours(0, 0, 0, 0);
        
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        endOfWeek.setHours(23, 59, 59, 999);

        const { data, error } = await supabase
          .from('social_media_posts')
          .select('*')
          .gte('scheduled_date', startOfWeek.toISOString())
          .lte('scheduled_date', endOfWeek.toISOString())
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
  }, [currentDate]);

  const handleEditPost = (post: SocialPost) => {
    setEditingPost(post);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingPost(null);
  };

  const filteredPosts = posts.filter(post => {
    const isPlatformSelected = selectedPlatforms.length === 0 || selectedPlatforms.includes(post.platform);
    const isStatusSelected = selectedStatuses.length === 0 || selectedStatuses.includes(post.status);
    return isPlatformSelected && isStatusSelected;
  });

  // Get up to 4 posts for social view
  const weeklyPosts = filteredPosts.slice(0, 4);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-muted-foreground">Loading preview...</div>
      </div>
    );
  }

  if (!weeklyPosts.length) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-muted-foreground">No posts available for preview</div>
      </div>
    );
  }

  const renderPost = (post: SocialPost, index: number) => {
    // Sample data for Facebook UI elements
    const sampleData = {
      companyName: "Green Apotheke",
      timestamp: `${31 - index}. červenec v ${19 + index}:0${index + 1}`,
      likes: Math.floor(Math.random() * 50) + 1,
      comments: Math.floor(Math.random() * 10) + 1,
      shares: Math.floor(Math.random() * 5),
    };

    return (
      <Card key={post.id} className="w-full shadow-lg">
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
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-muted-foreground hover:text-foreground"
              onClick={() => handleEditPost(post)}
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </div>

          {/* Post Content */}
          <div className="p-4">
            <div className="space-y-3">
              {post.title && (
                <h3 
                  className="font-semibold text-sm cursor-pointer hover:text-primary transition-colors"
                  onClick={() => handleEditPost(post)}
                >
                  {post.title}
                </h3>
              )}
              {post.content && (
                <div className="text-sm text-foreground leading-relaxed">
                  <p className="line-clamp-8">
                    {post.content}
                  </p>
                  {post.content.length > 200 && (
                    <span className="text-primary ml-1 cursor-pointer"> Zobrazit víc</span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Post Image */}
          {post.image_url && (
            <div className="relative w-full aspect-square">
              <img
                src={post.image_url}
                alt={post.title || "Post image"}
                className="w-full h-full object-cover"
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
    );
  };

  return (
    <div className="h-[calc(100vh-120px)] bg-muted/50">
      <ScrollArea className="h-full">
        <div className="p-6">
          <div className="flex flex-wrap gap-8 max-w-6xl mx-auto">
        {weeklyPosts.map((post, index) => (
          <div key={post.id} style={{ width: '500px' }}>
            {renderPost(post, index)}
          </div>
          ))}
          </div>
        </div>
      </ScrollArea>
      
      {/* PostModal for editing */}
      <PostModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        selectedDate={editingPost ? new Date(editingPost.scheduled_date) : null}
        editingPost={editingPost}
      />
    </div>
  );
};