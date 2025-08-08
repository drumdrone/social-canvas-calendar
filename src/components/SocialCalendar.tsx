import React, { useState, useEffect } from 'react';
import { CalendarHeader } from './calendar/CalendarHeader';
import { CalendarGrid } from './calendar/CalendarGrid';
import { CalendarList } from './calendar/CalendarList';
import { PostsTable } from './calendar/PostsTable';
import { PostModal } from './calendar/PostModal';
import { CalendarFilters } from './calendar/CalendarFilters';
import { FacebookPostPreview } from './calendar/FacebookPostPreview';
import { SettingsSidebar } from './settings/SettingsSidebar';
import { Button } from './ui/button';
import { Settings } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, addMonths, addWeeks } from 'date-fns';

export type ViewMode = 'month' | 'week' | 'list' | 'table';
export type Platform = string; // Changed to string to support dynamic platforms
export type PostStatus = string; // Changed to string to support dynamic statuses
export type Category = string; // Changed to string to support dynamic categories

export interface SocialPost {
  id: string;
  title: string;
  content?: string;
  platform: Platform;
  image_url?: string;
  scheduled_date: string;
  status: PostStatus;
  category: Category;
  created_at: string;
  updated_at: string;
  user_id: string;
}

export const SocialCalendar: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<SocialPost | null>(null);
  const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<PostStatus[]>([]);
  const [showSettings, setShowSettings] = useState(false);

  // Load initial platform and status selections from database
  useEffect(() => {
    const loadInitialSelections = async () => {
      try {
        const [platformsResult, statusesResult] = await Promise.all([
          supabase.from('platforms').select('name').eq('is_active', true),
          supabase.from('post_statuses').select('name').eq('is_active', true)
        ]);
        
        if (platformsResult.data) {
          setSelectedPlatforms(platformsResult.data.map(p => p.name));
        }
        if (statusesResult.data) {
          setSelectedStatuses(statusesResult.data.map(s => s.name));
        }
      } catch (error) {
        console.error('Error loading initial selections:', error);
      }
    };
    
    loadInitialSelections();
  }, []);

  // Listen for settings changes to refresh selections
  useEffect(() => {
    const handleSettingsChange = async () => {
      try {
        const [platformsResult, statusesResult] = await Promise.all([
          supabase.from('platforms').select('name').eq('is_active', true),
          supabase.from('post_statuses').select('name').eq('is_active', true)
        ]);
        
        if (platformsResult.data) {
          setSelectedPlatforms(platformsResult.data.map(p => p.name));
        }
        if (statusesResult.data) {
          setSelectedStatuses(statusesResult.data.map(s => s.name));
        }
      } catch (error) {
        console.error('Error refreshing selections:', error);
      }
    };

    window.addEventListener('settingsChanged', handleSettingsChange);
    return () => window.removeEventListener('settingsChanged', handleSettingsChange);
  }, []);

  const getDates = () => {
    const weekStartOptions = { weekStartsOn: 1 as const }; // Monday = 1
    
    if (viewMode === 'month') {
      const monthStart = startOfMonth(currentDate);
      const monthEnd = endOfMonth(currentDate);
      const calendarStart = startOfWeek(monthStart, weekStartOptions);
      const calendarEnd = endOfWeek(monthEnd, weekStartOptions);
      
      const dates = [];
      let day = calendarStart;
      
      while (day <= calendarEnd) {
        dates.push(day);
        day = addDays(day, 1);
      }
      
      return dates;
    } else {
      const weekStart = startOfWeek(currentDate, weekStartOptions);
      const dates = [];
      
      for (let i = 0; i < 7; i++) {
        dates.push(addDays(weekStart, i));
      }
      
      return dates;
    }
  };

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    setEditingPost(null);
    setIsModalOpen(true);
  };

  const handlePostClick = (post: SocialPost) => {
    setSelectedDate(new Date(post.scheduled_date));
    setEditingPost(post);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedDate(null);
    setEditingPost(null);
  };

  const handleWheel = (e: WheelEvent) => {
    e.preventDefault();
    
    if (e.deltaY > 0) {
      // Scroll down - go to next period
      if (viewMode === 'month') {
        setCurrentDate(prev => addMonths(prev, 1));
      } else if (viewMode === 'week') {
        setCurrentDate(prev => addWeeks(prev, 1));
      }
    } else {
      // Scroll up - go to previous period
      if (viewMode === 'month') {
        setCurrentDate(prev => addMonths(prev, -1));
      } else if (viewMode === 'week') {
        setCurrentDate(prev => addWeeks(prev, -1));
      }
    }
  };

  useEffect(() => {
    const calendarElement = document.querySelector('.calendar-container');
    if (calendarElement) {
      calendarElement.addEventListener('wheel', handleWheel, { passive: false });
      
      return () => {
        calendarElement.removeEventListener('wheel', handleWheel);
      };
    }
  }, [viewMode]);

  return (
    <div className="h-screen flex flex-col bg-background calendar-container overflow-hidden max-h-screen">
      <CalendarHeader 
        currentDate={currentDate}
        onDateChange={setCurrentDate}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />
      
      <CalendarFilters
        selectedPlatforms={selectedPlatforms}
        onPlatformsChange={setSelectedPlatforms}
        selectedStatuses={selectedStatuses}
        onStatusesChange={setSelectedStatuses}
      />
      <div className="flex-1 overflow-hidden">
        {viewMode === 'list' ? (
          <CalendarList
            currentDate={currentDate}
            selectedPlatforms={selectedPlatforms}
            selectedStatuses={selectedStatuses}
            onDateClick={handleDateClick}
            onPostClick={handlePostClick}
          />
        ) : viewMode === 'table' ? (
          <PostsTable
            selectedPlatforms={selectedPlatforms}
            selectedStatuses={selectedStatuses}
            currentDate={currentDate}
          />
        ) : viewMode === 'week' ? (
          <FacebookPostPreview
            selectedPlatforms={selectedPlatforms}
            selectedStatuses={selectedStatuses}
          />
        ) : (
          <CalendarGrid
            dates={getDates()}
            viewMode={viewMode}
            currentDate={currentDate}
            selectedPlatforms={selectedPlatforms}
            selectedStatuses={selectedStatuses}
            onDateClick={handleDateClick}
            onPostClick={handlePostClick}
          />
        )}
      </div>
      
      {viewMode !== 'table' && viewMode !== 'week' && (
        <PostModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          selectedDate={selectedDate}
          editingPost={editingPost}
        />
      )}
    </div>
  );
};