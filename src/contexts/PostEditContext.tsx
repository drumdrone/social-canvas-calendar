import React, { createContext, useContext, useState, ReactNode } from 'react';
import { PostSlidingSidebar } from '@/components/calendar/PostSlidingSidebar';
import { SocialPost } from '@/components/SocialCalendar';

interface PostEditContextType {
  openPostEdit: (post: SocialPost) => void;
  openNewPost: (date?: Date) => void;
  closePostEdit: () => void;
  isOpen: boolean;
}

const PostEditContext = createContext<PostEditContextType | undefined>(undefined);

interface PostEditProviderProps {
  children: ReactNode;
  onPostSaved?: () => void;
}

export const PostEditProvider: React.FC<PostEditProviderProps> = ({ children, onPostSaved }) => {
  const [showSidebar, setShowSidebar] = useState(false);
  const [sidebarPost, setSidebarPost] = useState<SocialPost | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const openPostEdit = (post: SocialPost) => {
    console.log('Opening post edit:', post);
    setSidebarPost(post);
    setSelectedDate(new Date(post.scheduled_date));
    setShowSidebar(true);
  };

  const openNewPost = (date?: Date) => {
    setSidebarPost(null);
    setSelectedDate(date || new Date());
    setShowSidebar(true);
  };

  const closePostEdit = () => {
    setShowSidebar(false);
    setSidebarPost(null);
    setSelectedDate(null);
  };

  const handleSave = () => {
    // Emit event to notify other components about post save
    window.dispatchEvent(new CustomEvent('postSaved'));

    if (onPostSaved) {
      onPostSaved();
    }
    closePostEdit();
  };

  return (
    <PostEditContext.Provider value={{ openPostEdit, openNewPost, closePostEdit, isOpen: showSidebar }}>
      {children}
      <PostSlidingSidebar
        isOpen={showSidebar}
        onClose={closePostEdit}
        post={sidebarPost}
        selectedDate={selectedDate}
        onSave={handleSave}
      />
    </PostEditContext.Provider>
  );
};

export const usePostEdit = () => {
  const context = useContext(PostEditContext);
  if (context === undefined) {
    throw new Error('usePostEdit must be used within a PostEditProvider');
  }
  return context;
};
