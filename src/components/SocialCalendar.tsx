import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CalendarHeader } from './calendar/CalendarHeader';
import { CalendarGrid } from './calendar/CalendarGrid';
import { CalendarList } from './calendar/CalendarList';
import { CalendarFilters } from './calendar/CalendarFilters';
import { FacebookPostPreview } from './calendar/FacebookPostPreview';
import { PostSlidingSidebar } from './calendar/PostSlidingSidebar';
import { PostDataManager } from './calendar/PostDataManager';
import { PlanningPanel } from './calendar/PlanningPanel';
import { SettingsSidebar } from './settings/SettingsSidebar';
import { Button } from './ui/button';
import { Settings, Plus, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { convexToSocialPost } from '@/integrations/convex/adapter';
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, addMonths, addWeeks } from 'date-fns';

export type ViewMode = 'month' | 'week' | 'list';
export type Platform = string; // Changed to string to support dynamic platforms
export type PostStatus = string; // Changed to string to support dynamic statuses
export type Category = string; // Changed to string to support dynamic categories

export interface SocialPost {
  id: string;
  title: string;
  content?: string;
  platform: Platform;
  image_url?: string;
  image_url_1?: string;
  image_url_2?: string;
  image_url_3?: string;
  scheduled_date: string;
  status: PostStatus;
  category: Category;
  created_at: string;
  updated_at: string;
  user_id: string;
  pillar?: string;
  product_line?: string;
  author?: string;
}

export const SocialCalendar: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [editingPost, setEditingPost] = useState<SocialPost | null>(null);
  const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<PostStatus[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [showPlanning, setShowPlanning] = useState(false);
  // We used to cache the whole clicked post in state, which meant the sidebar
  // kept showing whatever the post looked like at click time — even after a
  // Convex mutation updated it (e.g. clearing an image would stick in the
  // calendar but the sidebar re-opened with the stale image). Keep only the
  // id here and derive the live post from the reactive Convex query below.
  const [sidebarPostId, setSidebarPostId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const postsQ = useQuery(api.posts.list);
  const sidebarPost = React.useMemo<SocialPost | null>(() => {
    if (!sidebarPostId || !postsQ) return null;
    const doc = postsQ.find(
      (p: any) => (p.legacyId ?? p._id) === sidebarPostId,
    );
    return doc ? (convexToSocialPost(doc) as unknown as SocialPost) : null;
  }, [sidebarPostId, postsQ]);

  // Handle edit parameter from URL (e.g., from Quick Calendar)
  useEffect(() => {
    const editPostId = searchParams.get('edit');
    if (editPostId) {
      // Open the sidebar for the given post; the sidebar reads live post data
      // from the Convex query via sidebarPostId, so we don't need to fetch
      // anything here anymore. We still touch Supabase only to look up the
      // scheduled_date for the initial view (Convex would need a second query).
      const fetchAndEditPost = async () => {
        const { data, error } = await supabase
          .from('social_media_posts')
          .select('scheduled_date')
          .eq('id', editPostId)
          .single();

        if (data && !error) {
          setSidebarPostId(editPostId);
          setSelectedDate(new Date(data.scheduled_date));
          setShowSidebar(true);
          // Clear the URL parameter
          setSearchParams({});
        }
      };
      fetchAndEditPost();
    }
  }, [searchParams, setSearchParams]);

  // Reactive Convex reads of taxonomy — default the filter selection to
  // "everything active" so nothing is hidden on first render. Since useQuery
  // is reactive, the settingsChanged event listener is no longer needed:
  // adding/removing a platform/status flows through automatically.
  const platformsQ = useQuery(api.taxonomy.listPlatforms);
  const statusesQ = useQuery(api.taxonomy.listStatuses);
  useEffect(() => {
    if (platformsQ) {
      setSelectedPlatforms(
        platformsQ.filter((p: any) => p.isActive !== false).map((p: any) => p.name),
      );
    }
  }, [platformsQ]);
  useEffect(() => {
    if (statusesQ) {
      setSelectedStatuses(
        statusesQ.filter((s: any) => s.isActive !== false).map((s: any) => s.name),
      );
    }
  }, [statusesQ]);

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
    setSidebarPostId(null);
    setShowSidebar(true);
  };

  const handlePostClick = (post: SocialPost) => {
    console.log('Post clicked for editing:', post);
    setSidebarPostId(post.id);
    setEditingPost(post);
    setSelectedDate(new Date(post.scheduled_date));
    setShowSidebar(true);
  };

  const handleCloseSidebar = () => {
    setShowSidebar(false);
    setSidebarPostId(null);
    setEditingPost(null);
    setSelectedDate(null);
  };

  const handleSidebarSave = () => {
    // Refresh the calendar data without losing current date/state
    setRefreshKey(prev => prev + 1);
    handleCloseSidebar();
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
        <div className="flex flex-col lg:flex-row lg:items-center justify-between px-4 py-3 bg-muted/30 gap-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <Button 
              onClick={() => handleDateClick(new Date())}
              className="flex items-center gap-2 w-full sm:w-auto"
              size="sm"
            >
              <Plus className="h-4 w-4" />
              New Post
            </Button>
            <Button 
              onClick={() => setShowPlanning(true)}
              className="flex items-center gap-2 w-full sm:w-auto"
              size="sm"
              variant="outline"
            >
              <FileText className="h-4 w-4" />
              Planning
            </Button>
            <PostDataManager onImportComplete={handleSidebarSave} />
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSettings(true)}
            className="flex items-center gap-2 w-full sm:w-auto"
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
            key={refreshKey}
            currentDate={currentDate}
            selectedPlatforms={selectedPlatforms}
            selectedStatuses={selectedStatuses}
            onDateClick={handleDateClick}
            onPostClick={handlePostClick}
          />
        ) : viewMode === 'week' ? (
          <FacebookPostPreview
            key={refreshKey}
            selectedPlatforms={selectedPlatforms}
            selectedStatuses={selectedStatuses}
            currentDate={currentDate}
          />
        ) : (
          <CalendarGrid
            key={refreshKey}
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

      {/* Planning Panel */}
      <PlanningPanel
        selectedDate={selectedDate}
        isOpen={showPlanning}
        onClose={() => setShowPlanning(false)}
      />

      {/* Settings Sidebar */}
      <SettingsSidebar
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
      />
    </div>
  );
};