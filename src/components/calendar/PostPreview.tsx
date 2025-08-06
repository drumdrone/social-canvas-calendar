import React from 'react';
import { cn } from '@/lib/utils';
import { SocialPost } from '../SocialCalendar';
import { Facebook, Instagram, Twitter, Linkedin, Image } from 'lucide-react';

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

const statusColors = {
  draft: 'bg-status-draft/20 text-status-draft',
  published: 'bg-status-published/20 text-status-published',
  scheduled: 'bg-status-scheduled/20 text-status-scheduled',
};

export const PostPreview: React.FC<PostPreviewProps> = ({ post, onClick, compact = false }) => {
  const Icon = platformIcons[post.platform];
  
  return (
    <div 
      className={cn(
        "rounded-md border-l-2 cursor-pointer hover:bg-muted/50 transition-colors backdrop-blur-sm",
        compact ? "p-1 text-xs bg-background/80" : "p-2 text-xs bg-background/90",
        platformColors[post.platform]
      )}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
    >
      <div className="flex items-center gap-1 mb-1">
        <Icon className={compact ? "h-2 w-2" : "h-3 w-3"} />
        <span className="font-medium truncate flex-1">{post.title}</span>
        <span className={cn(
          "px-1 py-0.5 rounded font-medium",
          compact ? "text-xs" : "text-xs",
          statusColors[post.status]
        )}>
          {post.status.charAt(0).toUpperCase()}
        </span>
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
        <p className="text-muted-foreground truncate mt-1">
          {post.content}
        </p>
      )}
    </div>
  );
};