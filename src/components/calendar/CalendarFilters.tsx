import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Facebook, Instagram, Twitter, Linkedin, Filter } from 'lucide-react';
import { Platform, PostStatus } from '../SocialCalendar';

interface CalendarFiltersProps {
  selectedPlatforms: Platform[];
  onPlatformsChange: (platforms: Platform[]) => void;
  selectedStatuses: PostStatus[];
  onStatusesChange: (statuses: PostStatus[]) => void;
}

const platformIcons = {
  facebook: Facebook,
  instagram: Instagram,
  twitter: Twitter,
  linkedin: Linkedin,
};

const platformColors = {
  facebook: 'bg-social-facebook text-white',
  instagram: 'bg-social-instagram text-white',
  twitter: 'bg-social-twitter text-white',
  linkedin: 'bg-social-linkedin text-white',
};

const statusColors = {
  draft: 'bg-status-draft text-status-draft-foreground',
  published: 'bg-status-published text-white',
  scheduled: 'bg-status-scheduled text-white',
};

export const CalendarFilters: React.FC<CalendarFiltersProps> = ({
  selectedPlatforms,
  onPlatformsChange,
  selectedStatuses,
  onStatusesChange,
}) => {
  const handlePlatformToggle = (platform: Platform) => {
    if (selectedPlatforms.includes(platform)) {
      onPlatformsChange(selectedPlatforms.filter(p => p !== platform));
    } else {
      onPlatformsChange([...selectedPlatforms, platform]);
    }
  };

  const handleStatusToggle = (status: PostStatus) => {
    if (selectedStatuses.includes(status)) {
      onStatusesChange(selectedStatuses.filter(s => s !== status));
    } else {
      onStatusesChange([...selectedStatuses, status]);
    }
  };

  return (
    <div className="flex items-center gap-4 p-4 border-b border-border bg-card">
      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium text-foreground">Filters:</span>
      </div>
      
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Platforms:</span>
        {(['facebook', 'instagram', 'twitter', 'linkedin'] as Platform[]).map((platform) => {
          const Icon = platformIcons[platform];
          const isSelected = selectedPlatforms.includes(platform);
          
          return (
            <Button
              key={platform}
              variant={isSelected ? 'default' : 'outline'}
              size="sm"
              onClick={() => handlePlatformToggle(platform)}
              className={isSelected ? platformColors[platform] : ''}
            >
              <Icon className="h-4 w-4 mr-1" />
              {platform.charAt(0).toUpperCase() + platform.slice(1)}
            </Button>
          );
        })}
      </div>
      
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Status:</span>
        {(['draft', 'published', 'scheduled'] as PostStatus[]).map((status) => {
          const isSelected = selectedStatuses.includes(status);
          
          return (
            <Badge
              key={status}
              variant={isSelected ? 'default' : 'outline'}
              className={`cursor-pointer ${isSelected ? statusColors[status] : ''}`}
              onClick={() => handleStatusToggle(status)}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </Badge>
          );
        })}
      </div>
    </div>
  );
};