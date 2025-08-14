import React, { useState, useEffect } from 'react';
import { CalendarHeader } from './calendar/CalendarHeader';
import { CalendarGrid } from './calendar/CalendarGrid';
import { CalendarList } from './calendar/CalendarList';
import { PostsTable } from './calendar/PostsTable';
import { CalendarFilters } from './calendar/CalendarFilters';
import { FacebookPostPreview } from './calendar/FacebookPostPreview';
import { PostSlidingSidebar } from './calendar/PostSlidingSidebar';
import { PostDataManager } from './calendar/PostDataManager';
import { SettingsSidebar } from './settings/SettingsSidebar';
import { Button } from './ui/button';
import { Settings, Plus } from 'lucide-react';
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
  const [editingPost, setEditingPost] = useState<SocialPost | null>(null);
  const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<PostStatus[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [sidebarPost, setSidebarPost] = useState<SocialPost | null>(null);

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
    setSidebarPost(null);
    setShowSidebar(true);
  };

  const handlePostClick = (post: SocialPost) => {
    setSidebarPost(post);
    setEditingPost(post);
    setSelectedDate(new Date(post.scheduled_date));
    setShowSidebar(true);
  };

  const handleCloseSidebar = () => {
    setShowSidebar(false);
    setSidebarPost(null);
    setEditingPost(null);
    setSelectedDate(null);
  };

  const handleSidebarSave = () => {
    // Refresh the calendar data
    window.location.reload();
  };

  // Removed calendar month/week scrolling behavior
  // Scroll wheel now only scrolls content, not calendar navigation

  return (
    <div className="h-screen flex flex-col bg-background calendar-container overflow-hidden max-h-screen">
      {/* Header with controls */}
      <div className="border-b border-border">
        <CalendarHeader 
          currentDate={currentDate}
          onDateChange={setCurrentDate}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
        />
        
        {/* Action Bar */}
        <div className="flex items-center justify-between px-4 py-3 bg-muted/30">
          <div className="flex items-center gap-3">
            <Button 
              onClick={() => handleDateClick(new Date())}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              New Post
            </Button>
            <PostDataManager onImportComplete={handleSidebarSave} />
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSettings(true)}
            className="flex items-center gap-2"
          >
            <Settings className="h-4 w-4" />
            Settings
          </Button>
        </div>
        
        <CalendarFilters
          selectedPlatforms={selectedPlatforms}
          onPlatformsChange={setSelectedPlatforms}
          selectedStatuses={selectedStatuses}
          onStatusesChange={setSelectedStatuses}
        />
      </div>
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
            currentDate={currentDate}
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
      
      {/* Sliding Sidebar for Post Creation/Editing */}
      <PostSlidingSidebar
        isOpen={showSidebar}
        onClose={handleCloseSidebar}
        post={sidebarPost}
        selectedDate={selectedDate}
        onSave={handleSidebarSave}
      />

      {/* Settings Sidebar */}
      <SettingsSidebar
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
      />
    </div>
  );
};