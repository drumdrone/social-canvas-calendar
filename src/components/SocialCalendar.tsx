import React, { useState } from 'react';
import { CalendarHeader } from './calendar/CalendarHeader';
import { CalendarGrid } from './calendar/CalendarGrid';
import { PostModal } from './calendar/PostModal';
import { CalendarFilters } from './calendar/CalendarFilters';
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameDay, format, isToday, isWeekend } from 'date-fns';

export type ViewMode = 'month' | 'week';
export type Platform = 'facebook' | 'instagram' | 'twitter' | 'linkedin';
export type PostStatus = 'draft' | 'published' | 'scheduled';
export type Category = 'Video' | 'Image' | 'Carousel';

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
  const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>(['facebook', 'instagram', 'twitter', 'linkedin']);
  const [selectedStatuses, setSelectedStatuses] = useState<PostStatus[]>(['draft', 'published', 'scheduled']);

  const getDates = () => {
    if (viewMode === 'month') {
      const monthStart = startOfMonth(currentDate);
      const monthEnd = endOfMonth(currentDate);
      const calendarStart = startOfWeek(monthStart);
      const calendarEnd = endOfWeek(monthEnd);
      
      const dates = [];
      let day = calendarStart;
      
      while (day <= calendarEnd) {
        dates.push(day);
        day = addDays(day, 1);
      }
      
      return dates;
    } else {
      const weekStart = startOfWeek(currentDate);
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

  return (
    <div className="h-screen flex flex-col bg-background scale-[0.8] origin-top">
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
      
      <CalendarGrid
        dates={getDates()}
        viewMode={viewMode}
        currentDate={currentDate}
        selectedPlatforms={selectedPlatforms}
        selectedStatuses={selectedStatuses}
        onDateClick={handleDateClick}
        onPostClick={handlePostClick}
      />
      
      <PostModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        selectedDate={selectedDate}
        editingPost={editingPost}
      />
    </div>
  );
};