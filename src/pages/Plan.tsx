import React, { useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { AppLayout } from '@/components/layout/AppLayout';
import { RecurringActionsGrid } from '@/components/plan/RecurringActionsGrid';
import { PostSlidingSidebar } from '@/components/calendar/PostSlidingSidebar';
import { convexToSocialPost } from '@/integrations/convex/adapter';
import { SocialPost } from '@/components/SocialCalendar';

const Plan = () => {
  const [showSidebar, setShowSidebar] = useState(false);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // RecurringActionCard passes legacyId ?? _id as the post id; look it up in
  // the already-reactive posts list the same way SocialCalendar does.
  const postsQ = useQuery(api.posts.list);
  const editingPost = React.useMemo<SocialPost | null>(() => {
    if (!editingPostId || !postsQ) return null;
    const doc = postsQ.find((p: any) => (p.legacyId ?? p._id) === editingPostId);
    return doc ? (convexToSocialPost(doc) as unknown as SocialPost) : null;
  }, [editingPostId, postsQ]);

  const handlePostClick = (postId: string) => {
    setEditingPostId(postId);
    setShowSidebar(true);
  };

  const handleCloseSidebar = () => {
    setShowSidebar(false);
    setEditingPostId(null);
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