import React, { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { RecurringActionsGrid } from '@/components/plan/RecurringActionsGrid';
import { PostSlidingSidebar } from '@/components/calendar/PostSlidingSidebar';
import { supabase } from '@/integrations/supabase/client';
import { SocialPost } from '@/components/SocialCalendar';

const Plan = () => {
  const [showSidebar, setShowSidebar] = useState(false);
  const [editingPost, setEditingPost] = useState<SocialPost | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const handlePostClick = async (postId: string) => {
    try {
      const { data, error } = await supabase
        .from('social_media_posts')
        .select('*')
        .eq('id', postId)
        .single();

      if (error) throw error;

      if (data) {
        setEditingPost(data as SocialPost);
        setShowSidebar(true);
      }
    } catch (error) {
      console.error('Error loading post:', error);
    }
  };

  const handleCloseSidebar = () => {
    setShowSidebar(false);
    setEditingPost(null);
  };

  const handleSidebarSave = () => {
    setRefreshKey(prev => prev + 1);
    handleCloseSidebar();
  };

  return (
    <AppLayout>
      <div className="min-h-screen flex flex-col bg-background">
        <RecurringActionsGrid
          key={refreshKey}
          onPostClick={handlePostClick}
        />
      </div>

      <PostSlidingSidebar
        isOpen={showSidebar}
        onClose={handleCloseSidebar}
        post={editingPost}
        selectedDate={editingPost ? new Date(editingPost.scheduled_date) : null}
        onSave={handleSidebarSave}
      />
    </AppLayout>
  );
};

export default Plan;