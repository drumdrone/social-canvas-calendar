import React, { useState, useEffect } from 'react';
import { Facebook, Instagram, Twitter, Linkedin } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Filter } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Platform, PostStatus } from '../SocialCalendar';

interface CalendarFiltersProps {
  selectedPlatforms: Platform[];
  onPlatformsChange: (platforms: Platform[]) => void;
  selectedStatuses: PostStatus[];
  onStatusesChange: (statuses: PostStatus[]) => void;
}

interface DbPlatform {
  id: string;
  name: string;
  icon_name: string;
  color: string;
  is_active: boolean;
}

interface DbStatus {
  id: string;
  name: string;
  color: string;
  is_active: boolean;
}

export const CalendarFilters: React.FC<CalendarFiltersProps> = ({
  selectedPlatforms,
  onPlatformsChange,
  selectedStatuses,
  onStatusesChange,
}) => {
  const [availablePlatforms, setAvailablePlatforms] = useState<DbPlatform[]>([]);
  const [availableStatuses, setAvailableStatuses] = useState<DbStatus[]>([]);

  // Fetch platforms and statuses from database
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [platformsResult, statusesResult] = await Promise.all([
          supabase.from('platforms').select('*').eq('is_active', true).order('name'),
          supabase.from('post_statuses').select('*').eq('is_active', true).order('name')
        ]);
        
        if (platformsResult.data) {
          setAvailablePlatforms(platformsResult.data);
        }
        if (statusesResult.data) {
          setAvailableStatuses(statusesResult.data);
        }
      } catch (error) {
        console.error('Error fetching filter data:', error);
      }
    };
    
    fetchData();
  }, []);

  const platformIcons = {
    facebook: Facebook,
    instagram: Instagram,
    twitter: Twitter,
    linkedin: Linkedin,
  } as const;

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
    <div className="flex items-center gap-4 p-4 border-b border-border bg-card flex-shrink-0">
      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium text-foreground">Filters:</span>
      </div>
      
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Platforms:</span>
        {availablePlatforms.map((platform) => {
          const Icon = platformIcons[platform.name as keyof typeof platformIcons] || 
                      LucideIcons[platform.icon_name as keyof typeof LucideIcons] as any;
          const isSelected = selectedPlatforms.includes(platform.name);
          
          return (
            <Button
              key={platform.id}
              variant={isSelected ? 'default' : 'outline'}
              size="sm"
              onClick={() => handlePlatformToggle(platform.name)}
              style={isSelected ? { backgroundColor: platform.color, color: 'white' } : { borderColor: platform.color, color: platform.color }}
            >
              {Icon && <Icon className="h-4 w-4 mr-1" />}
              {platform.name.charAt(0).toUpperCase() + platform.name.slice(1)}
            </Button>
          );
        })}
      </div>
      
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Status:</span>
        {availableStatuses.map((status) => {
          const isSelected = selectedStatuses.includes(status.name);
          
          return (
            <Badge
              key={status.id}
              variant={isSelected ? 'default' : 'outline'}
              className="cursor-pointer"
              style={isSelected ? { backgroundColor: status.color, color: 'white' } : { borderColor: status.color, color: status.color }}
              onClick={() => handleStatusToggle(status.name)}
            >
              {status.name.charAt(0).toUpperCase() + status.name.slice(1)}
            </Badge>
          );
        })}
      </div>
    </div>
  );
};