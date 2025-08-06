import React from 'react';
import { cn } from '@/lib/utils';
import { SocialPost } from '../SocialCalendar';
import { Facebook, Instagram, Twitter, Linkedin, Image } from 'lucide-react';

interface PostPreviewProps {
  post: SocialPost;
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

export const PostPreview: React.FC<PostPreviewProps> = ({ post }) => {
  const Icon = platformIcons[post.platform];
  
  return (
    <div className={cn(
      "p-2 rounded-md border-l-2 text-xs",
      platformColors[post.platform]
    )}>
      <div className="flex items-center gap-1 mb-1">
        <Icon className="h-3 w-3" />
        <span className="font-medium truncate flex-1">{post.title}</span>
        <span className={cn(
          "px-1 py-0.5 rounded text-xs font-medium",
          statusColors[post.status]
        )}>
          {post.status.charAt(0).toUpperCase()}
        </span>
      </div>
      
      {post.image_url && (
        <div className="flex items-center gap-1 mt-1">
          <img 
            src={post.image_url} 
            alt="Post thumbnail" 
            className="w-8 h-8 rounded object-cover"
          />
          <span className="text-muted-foreground text-xs">Image</span>
        </div>
      )}
      
      {post.content && (
        <p className="text-muted-foreground truncate mt-1">
          {post.content}
        </p>
      )}
    </div>
  );
};