import React, { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { SocialPost } from '../SocialCalendar';
import { Facebook, Instagram, Twitter, Linkedin, Image, Share2, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { toast } from 'sonner';
import { useImageHover } from '@/hooks/useImageHover';

interface PostPreviewProps {
  post: SocialPost;
  onClick?: () => void;
  compact?: boolean;
}

const platformIcons = {
  facebook: Facebook,
  instagram: Instagram,
  twitter: Twitter,
  linkedin: Linkedin,
};

const platformColors = {
  facebook: 'border-social-facebook bg-social-facebook/10',
  instagram: 'border-social-instagram bg-social-instagram/10',
  twitter: 'border-social-twitter bg-social-twitter/10',
  linkedin: 'border-social-linkedin bg-social-linkedin/10',
};

export const PostPreview: React.FC<PostPreviewProps> = ({ post, onClick, compact = false }) => {
  const Icon = platformIcons[post.platform as keyof typeof platformIcons] || Facebook;

  const postImages = [
    post.image_url_1 || post.image_url,
    post.image_url_2,
    post.image_url_3
  ].filter(Boolean) as string[];

  const { currentImage, setIsHovering, hasMultipleImages } = useImageHover(postImages);

  // Reactive Convex lookup — cached across every PostPreview instance so we
  // aren't running a query per row. Two per-row lookups become two shared list
  // reads that produce lookup maps.
  const authorsQ = useQuery(api.authors.list, {});
  const statusesQ = useQuery(api.taxonomy.listStatuses);
  const authorData = useMemo(() => {
    if (!post.author || !authorsQ) return null;
    const match = authorsQ.find((a: any) => a.initials === post.author);
    return match ? { initials: match.initials, color: match.color ?? '' } : null;
  }, [post.author, authorsQ]);
  const statusColor = useMemo(() => {
    const match = (statusesQ ?? []).find((s: any) => s.name === post.status);
    return match?.color ?? '#6B7280';
  }, [post.status, statusesQ]);
  
  const handleCopyLink = (e: React.MouseEvent) => {
    e.stopPropagation();
    const shareableUrl = `${window.location.origin}/post/${post.id}`;
    navigator.clipboard.writeText(shareableUrl);
    toast.success('Share link copied to clipboard!');
  };
  
  return (
    <div
      className={cn(
        "rounded-md border-l-2 cursor-pointer hover:bg-muted/50 transition-colors backdrop-blur-sm",
        compact ? "p-1 text-xs bg-background/80" : "p-2 text-xs bg-background/90",
        platformColors[post.platform as keyof typeof platformColors] || 'border-gray-500 bg-gray-500/10'
      )}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
    >
      <div className="flex items-start justify-between mb-1 relative">
        <div className="flex items-center gap-1 flex-1 pr-2">
          <Icon className={compact ? "h-2 w-2" : "h-3 w-3"} />
          <span className="font-medium truncate flex-1">{post.title}</span>
        </div>
        
        {/* Right side with author badge and status */}
        <div className="flex items-center gap-1 absolute top-0 right-0 bg-background/90 rounded-md p-1">
          {post.author && authorData && (
            <div
              className="rounded-full w-7 h-7 flex items-center justify-center text-white font-bold text-xs shadow-md p-1"
              style={{ backgroundColor: authorData.color }}
            >
              {authorData.initials.slice(0, 3)}
            </div>
          )}
          <span
            className="px-1.5 py-0.5 rounded-full font-medium text-xs text-white"
            style={{ backgroundColor: statusColor }}
          >
            {post.status.charAt(0).toUpperCase()}
          </span>
          {!compact && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopyLink}
              className="h-5 w-5 p-0 hover:bg-background/80"
            >
              <Share2 className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>
      
      {!compact && post.image_url && (
        <div className="flex items-center gap-1 mt-1">
          <img 
            src={post.image_url} 
            alt="Post thumbnail" 
            className="w-6 h-6 rounded object-cover"
          />
          <span className="text-muted-foreground text-xs">Image</span>
        </div>
      )}
      
      {!compact && post.content && (
        <p className="text-muted-foreground line-clamp-2 mt-1 text-xs leading-tight">
          {post.content}
        </p>
      )}
    </div>
  );
};