import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { format } from 'date-fns';
import { Facebook, Instagram, Twitter, Linkedin, Calendar, Clock, Image as ImageIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { SocialPost } from '@/components/SocialCalendar';

const platformIcons = {
  facebook: Facebook,
  instagram: Instagram,
  twitter: Twitter,
  linkedin: Linkedin,
};

const platformColors = {
  facebook: 'border-social-facebook bg-social-facebook/10 text-social-facebook',
  instagram: 'border-social-instagram bg-social-instagram/10 text-social-instagram',
  twitter: 'border-social-twitter bg-social-twitter/10 text-social-twitter',
  linkedin: 'border-social-linkedin bg-social-linkedin/10 text-social-linkedin',
};

const statusColors = {
  draft: 'bg-status-draft/20 text-status-draft',
  published: 'bg-status-published/20 text-status-published',
  scheduled: 'bg-status-scheduled/20 text-status-scheduled',
};

const ShareablePost = () => {
  const { id } = useParams<{ id: string }>();
  const [post, setPost] = useState<SocialPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPost = async () => {
      if (!id) {
        setError('No post ID provided');
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('social_media_posts')
          .select('*')
          .eq('id', id)
          .single();

        if (error) {
          setError('Post not found');
        } else {
          setPost(data as SocialPost);
        }
      } catch (err) {
        setError('Failed to fetch post');
      } finally {
        setLoading(false);
      }
    };

    fetchPost();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading post...</p>
        </div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-destructive mb-2">Post Not Found</h1>
          <p className="text-muted-foreground">{error || 'The requested post could not be found.'}</p>
        </div>
      </div>
    );
  }

  const Icon = platformIcons[post.platform];

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto">
        <Card className="w-full">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Icon className="h-5 w-5" />
                {post.title}
              </CardTitle>
              <div className="flex items-center gap-2">
                <Badge 
                  variant="outline" 
                  className={platformColors[post.platform]}
                >
                  {post.platform}
                </Badge>
                <Badge 
                  variant="secondary"
                  className={statusColors[post.status]}
                >
                  {post.status}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Scheduled Date & Time */}
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                <span>{format(new Date(post.scheduled_date), 'MMM dd, yyyy')}</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                <span>{format(new Date(post.scheduled_date), 'HH:mm')}</span>
              </div>
            </div>

            {/* Image */}
            {post.image_url && (
              <div className="space-y-2">
                <h3 className="font-medium flex items-center gap-2">
                  <ImageIcon className="h-4 w-4" />
                  Image
                </h3>
                <div className="border rounded-lg overflow-hidden">
                  <img 
                    src={post.image_url} 
                    alt="Post image" 
                    className="w-full h-auto max-h-[600px] object-contain"
                  />
                </div>
              </div>
            )}

            {/* Content */}
            {post.content && (
              <div className="space-y-2">
                <h3 className="font-medium">Content</h3>
                <div className="prose prose-sm max-w-none">
                  <p className="whitespace-pre-wrap text-foreground">{post.content}</p>
                </div>
              </div>
            )}

            {/* Meta Information */}
            <div className="border-t pt-4 space-y-2">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                {post.category && (
                  <div>
                    <span className="font-medium">Category:</span>
                    <span className="ml-2 text-muted-foreground">{post.category}</span>
                  </div>
                )}
                {(post as any).pillar && (
                  <div>
                    <span className="font-medium">Pillar:</span>
                    <span className="ml-2 text-muted-foreground">{(post as any).pillar}</span>
                  </div>
                )}
                {(post as any).product_line && (
                  <div>
                    <span className="font-medium">Product Line:</span>
                    <span className="ml-2 text-muted-foreground">{(post as any).product_line}</span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ShareablePost;