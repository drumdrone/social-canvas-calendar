import React, { useState, useEffect } from 'react';
import { format, startOfMonth, isSameMonth } from 'date-fns';
import { Facebook, Instagram, Twitter, Linkedin, Calendar, Clock, Trash2, Plus, Save, X, Edit, Upload, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Platform, PostStatus, SocialPost, Category } from '../SocialCalendar';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface PostsTableProps {
  selectedPlatforms: Platform[];
  selectedStatuses: PostStatus[];
  currentDate: Date;
}

interface EditingField {
  postId: string;
  field: string;
}

interface HoverImageState {
  isVisible: boolean;
  imageUrl: string;
  position: { x: number; y: number };
}

const platformIcons = {
  facebook: Facebook,
  instagram: Instagram,
  twitter: Twitter,
  linkedin: Linkedin,
};

export const PostsTable: React.FC<PostsTableProps> = ({
  selectedPlatforms,
  selectedStatuses,
  currentDate,
}) => {
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [availablePlatforms, setAvailablePlatforms] = useState<any[]>([]);
  const [availableStatuses, setAvailableStatuses] = useState<any[]>([]);
  const [availableCategories, setAvailableCategories] = useState<any[]>([]);
  const [editingField, setEditingField] = useState<EditingField | null>(null);
  const [uploadingImage, setUploadingImage] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [hoverImage, setHoverImage] = useState<HoverImageState>({
    isVisible: false,
    imageUrl: '',
    position: { x: 0, y: 0 }
  });
  const [newPost, setNewPost] = useState({
    title: '',
    content: '',
    platform: 'facebook' as Platform,
    status: 'draft' as PostStatus,
    category: 'Image' as Category,
    scheduled_date: format(new Date(), 'yyyy-MM-dd'),
    time: '12:00',
    image: null as File | null,
  });

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('social_media_posts')
        .select('*')
        .order('scheduled_date', { ascending: true });

      if (error) {
        console.error('Error fetching posts:', error);
      } else {
        setPosts((data as SocialPost[]) || []);
      }
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDynamicData = async () => {
    try {
      const [platformsResult, statusesResult, categoriesResult] = await Promise.all([
        supabase.from('platforms').select('*').eq('is_active', true).order('name'),
        supabase.from('post_statuses').select('*').eq('is_active', true).order('name'),
        supabase.from('categories').select('*').eq('is_active', true).order('name')
      ]);
      
      if (platformsResult.data) setAvailablePlatforms(platformsResult.data);
      if (statusesResult.data) setAvailableStatuses(statusesResult.data);
      if (categoriesResult.data) setAvailableCategories(categoriesResult.data);
    } catch (error) {
      console.error('Error fetching dynamic data:', error);
    }
  };

  // Listen for settings changes to refresh data
  useEffect(() => {
    const handleSettingsChange = () => {
      fetchDynamicData();
    };

    window.addEventListener('settingsChanged', handleSettingsChange);
    return () => window.removeEventListener('settingsChanged', handleSettingsChange);
  }, []);

  useEffect(() => {
    fetchPosts();
    fetchDynamicData();
  }, []);

  // Allow pasting image into the "New Post" row
  useEffect(() => {
    if (!isCreating) return;
    const onPaste = (e: any) => {
      const items = e.clipboardData?.items || [];
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item && item.type && item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) {
            setNewPost(prev => ({ ...prev, image: file }));
            toast.success('Image pasted from clipboard');
            break;
          }
        }
      }
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [isCreating]);

  const filteredPosts = posts.filter(post => {
    const isPlatformSelected = selectedPlatforms.length === 0 || selectedPlatforms.includes(post.platform);
    const isStatusSelected = selectedStatuses.length === 0 || selectedStatuses.includes(post.status);
    return isPlatformSelected && isStatusSelected;
  });

  // Group posts by month
  const groupedPosts = filteredPosts.reduce((groups, post) => {
    const monthKey = format(startOfMonth(new Date(post.scheduled_date)), 'yyyy-MM');
    if (!groups[monthKey]) {
      groups[monthKey] = [];
    }
    groups[monthKey].push(post);
    return groups;
  }, {} as Record<string, SocialPost[]>);

  // Sort months in descending order (newest first)
  const sortedMonths = Object.keys(groupedPosts).sort((a, b) => b.localeCompare(a));

  const handleEdit = (postId: string, field: string) => {
    setEditingField({ postId, field });
  };

  const handleImageUpload = async (postId: string, file: File) => {
    setUploadingImage(postId);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `public/${fileName}`;

      const { data, error } = await supabase.storage
        .from('social-media-images')
        .upload(filePath, file);

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('social-media-images')
        .getPublicUrl(filePath);

      await handleSaveField(postId, 'image_url', publicUrl);
      toast.success('Image uploaded successfully!');
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Failed to upload image');
    } finally {
      setUploadingImage(null);
    }
  };

  const handleSaveField = async (postId: string, field: string, value: any) => {
    try {
      const updateData: any = { [field]: value };
      
      const { error } = await supabase
        .from('social_media_posts')
        .update(updateData)
        .eq('id', postId);

      if (error) throw error;

      // Update local state
      setPosts(posts.map(post => 
        post.id === postId ? { ...post, [field]: value } : post
      ));
      
      setEditingField(null);
    } catch (error) {
      console.error('Error updating post:', error);
      toast.error('Failed to update post');
    }
  };

  const handleSave = async (post: SocialPost) => {
    try {
      const { error } = await supabase
        .from('social_media_posts')
        .update({
          title: post.title,
          content: post.content,
          platform: post.platform,
          status: post.status,
          category: post.category,
          scheduled_date: post.scheduled_date,
        })
        .eq('id', post.id);

      if (error) throw error;

      toast.success('Post updated successfully!');
      fetchPosts();
    } catch (error) {
      console.error('Error updating post:', error);
      toast.error('Failed to update post');
    }
  };

  const handleDelete = async (postId: string) => {
    try {
      const { error } = await supabase
        .from('social_media_posts')
        .delete()
        .eq('id', postId);

      if (error) throw error;

      toast.success('Post deleted successfully!');
      fetchPosts();
    } catch (error) {
      console.error('Error deleting post:', error);
      toast.error('Failed to delete post');
    }
  };

  const handleCreateNew = async () => {
    if (!newPost.title.trim()) {
      toast.error('Title is required');
      return;
    }

    try {
      const scheduledDateTime = new Date(newPost.scheduled_date);
      const [hours, minutes] = newPost.time.split(':').map(Number);
      scheduledDateTime.setHours(hours, minutes, 0, 0);

      let imageUrl = null;
      if (newPost.image) {
        const fileExt = newPost.image.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `public/${fileName}`;

        const { data, error: uploadError } = await supabase.storage
          .from('social-media-images')
          .upload(filePath, newPost.image);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('social-media-images')
          .getPublicUrl(filePath);

        imageUrl = publicUrl;
      }

      const { error } = await supabase
        .from('social_media_posts')
        .insert([{
          title: newPost.title,
          content: newPost.content || null,
          platform: newPost.platform,
          status: newPost.status,
          category: newPost.category,
          scheduled_date: scheduledDateTime.toISOString(),
          image_url: imageUrl,
          user_id: '00000000-0000-0000-0000-000000000000',
        }]);

      if (error) throw error;

      toast.success('Post created successfully!');
      setIsCreating(false);
      setNewPost({
        title: '',
        content: '',
        platform: 'facebook',
        status: 'draft',
        category: 'Image',
        scheduled_date: format(new Date(), 'yyyy-MM-dd'),
        time: '12:00',
        image: null,
      });
      fetchPosts();
    } catch (error) {
      console.error('Error creating post:', error);
      toast.error('Failed to create post');
    }
  };

  const handleImageHover = (e: React.MouseEvent, imageUrl: string) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setHoverImage({
      isVisible: true,
      imageUrl,
      position: {
        x: rect.right + 10,
        y: rect.top
      }
    });
  };

  const handleImageLeave = () => {
    setHoverImage({
      isVisible: false,
      imageUrl: '',
      position: { x: 0, y: 0 }
    });
  };

  const updatePost = (postId: string, field: string, value: any) => {
    setPosts(posts.map(post => 
      post.id === postId ? { ...post, [field]: value } : post
    ));
  };

  const renderEditableCell = (post: SocialPost, field: string, value: any, type: 'input' | 'textarea' | 'select' | 'date' | 'time' = 'input') => {
    const isEditing = editingField?.postId === post.id && editingField?.field === field;
    
    if (isEditing) {
      switch (type) {
        case 'textarea':
          return (
            <Textarea
              value={value || ''}
              onChange={(e) => updatePost(post.id, field, e.target.value)}
              onBlur={() => handleSaveField(post.id, field, value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.ctrlKey) {
                  handleSaveField(post.id, field, value);
                }
                if (e.key === 'Escape') {
                  setEditingField(null);
                }
              }}
              autoFocus
              rows={2}
              className="min-w-[200px]"
            />
          );
        case 'select':
          if (field === 'platform') {
            return (
              <Select 
                value={value} 
                onValueChange={(newValue) => {
                  updatePost(post.id, field, newValue);
                  handleSaveField(post.id, field, newValue);
                }}
              >
                <SelectTrigger className="min-w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availablePlatforms.map((p) => {
                    const Icon = platformIcons[p.name as keyof typeof platformIcons];
                    return (
                      <SelectItem key={p.id} value={p.name}>
                        <div className="flex items-center gap-2">
                          {Icon && <Icon className="h-4 w-4" />}
                          {p.name.charAt(0).toUpperCase() + p.name.slice(1)}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            );
          } else if (field === 'status') {
            return (
              <Select 
                value={value} 
                onValueChange={(newValue) => {
                  updatePost(post.id, field, newValue);
                  handleSaveField(post.id, field, newValue);
                }}
              >
                <SelectTrigger className="min-w-[100px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableStatuses.map((s) => (
                    <SelectItem key={s.id} value={s.name}>
                      <span className="capitalize">{s.name}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            );
          }
          break;
        case 'date':
          return (
            <Input
              type="date"
              value={format(new Date(value), 'yyyy-MM-dd')}
              onChange={(e) => {
                const newDate = new Date(e.target.value);
                const originalDate = new Date(value);
                newDate.setHours(originalDate.getHours(), originalDate.getMinutes());
                const updatedValue = newDate.toISOString();
                updatePost(post.id, field, updatedValue);
              }}
              onBlur={() => handleSaveField(post.id, field, posts.find(p => p.id === post.id)?.scheduled_date || value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSaveField(post.id, field, posts.find(p => p.id === post.id)?.scheduled_date || value);
                }
                if (e.key === 'Escape') {
                  setEditingField(null);
                }
              }}
              autoFocus
              className="min-w-[140px]"
            />
          );
        case 'time':
          return (
            <Input
              type="time"
              value={format(new Date(value), 'HH:mm')}
              onChange={(e) => {
                const [hours, minutes] = e.target.value.split(':').map(Number);
                const newDate = new Date(value);
                newDate.setHours(hours, minutes);
                const updatedValue = newDate.toISOString();
                updatePost(post.id, field, updatedValue);
              }}
              onBlur={() => handleSaveField(post.id, field, posts.find(p => p.id === post.id)?.scheduled_date || value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSaveField(post.id, field, posts.find(p => p.id === post.id)?.scheduled_date || value);
                }
                if (e.key === 'Escape') {
                  setEditingField(null);
                }
              }}
              autoFocus
              className="min-w-[100px]"
            />
          );
        default:
          return (
            <Input
              value={value || ''}
              onChange={(e) => updatePost(post.id, field, e.target.value)}
              onBlur={() => handleSaveField(post.id, field, value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSaveField(post.id, field, value);
                }
                if (e.key === 'Escape') {
                  setEditingField(null);
                }
              }}
              autoFocus
              className="min-w-[150px]"
            />
          );
      }
    }

    return (
      <div 
        onClick={() => handleEdit(post.id, field)}
        className="cursor-pointer hover:bg-muted/50 p-1 rounded min-h-[32px] flex items-center"
      >
        {type === 'textarea' ? (
          <div className="text-sm max-w-[200px] truncate">{value || 'Click to edit'}</div>
        ) : type === 'select' && field === 'platform' ? (
          <div className="flex items-center gap-2">
            {(() => {
              const platform = availablePlatforms.find(p => p.name === value);
              const Icon = platform ? platformIcons[platform.name as keyof typeof platformIcons] : null;
              return (
                <>
                  {Icon && <Icon className="h-4 w-4" />}
                  <span className="capitalize">{value}</span>
                </>
              );
            })()}
          </div>
        ) : type === 'date' ? (
          <div className="text-sm">{format(new Date(value), 'MMM d, yyyy')}</div>
        ) : type === 'time' ? (
          <div className="text-sm text-muted-foreground">{format(new Date(value), 'HH:mm')}</div>
        ) : (
          <div className="text-sm">{value || 'Click to edit'}</div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-muted-foreground">Loading posts...</div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Social Media Posts</h2>
        <Button onClick={() => setIsCreating(true)} disabled={isCreating}>
          <Plus className="h-4 w-4 mr-2" />
          New Post
        </Button>
      </div>

      <div className="bg-card rounded-lg border border-border">
        <ScrollArea className="h-[calc(100vh-200px)]">
          <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">Image</TableHead>
              <TableHead className="w-[200px]">Title</TableHead>
              <TableHead className="w-[250px]">Content</TableHead>
              <TableHead className="w-[150px]">Platform</TableHead>
              <TableHead className="w-[120px]">Status</TableHead>
              <TableHead className="w-[150px]">Scheduled Date</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isCreating && (
              <TableRow>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => document.getElementById('new-image-upload')?.click()}
                      className="flex items-center gap-1"
                    >
                      <Upload className="h-3 w-3" />
                      {newPost.image ? 'Change' : 'Upload'}
                    </Button>
                    {newPost.image && (
                      <span className="text-xs text-muted-foreground truncate max-w-[60px]">
                        {newPost.image.name}
                      </span>
                    )}
                    <input
                      id="new-image-upload"
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setNewPost({...newPost, image: file});
                        }
                      }}
                      className="hidden"
                    />
                  </div>
                </TableCell>
                <TableCell>
                  <Input
                    value={newPost.title}
                    onChange={(e) => setNewPost({...newPost, title: e.target.value})}
                    placeholder="Post title..."
                  />
                </TableCell>
                <TableCell>
                  <Textarea
                    value={newPost.content}
                    onChange={(e) => setNewPost({...newPost, content: e.target.value})}
                    placeholder="Post content..."
                    rows={2}
                  />
                </TableCell>
                <TableCell>
                  <Select value={newPost.platform} onValueChange={(value: Platform) => setNewPost({...newPost, platform: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {availablePlatforms.map((platform) => {
                        const Icon = platformIcons[platform.name as keyof typeof platformIcons];
                        return (
                          <SelectItem key={platform.id} value={platform.name}>
                            <div className="flex items-center gap-2">
                              {Icon && <Icon className="h-4 w-4" />}
                              {platform.name.charAt(0).toUpperCase() + platform.name.slice(1)}
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <Select value={newPost.status} onValueChange={(value: PostStatus) => setNewPost({...newPost, status: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                <SelectContent>
                  {availableStatuses.map((status) => (
                    <SelectItem key={status.id} value={status.name}>
                      <span className="capitalize">{status.name}</span>
                    </SelectItem>
                  ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <div className="space-y-2">
                    <Input
                      type="date"
                      value={newPost.scheduled_date}
                      onChange={(e) => setNewPost({...newPost, scheduled_date: e.target.value})}
                    />
                    <Input
                      type="time"
                      value={newPost.time}
                      onChange={(e) => setNewPost({...newPost, time: e.target.value})}
                    />
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button size="sm" onClick={handleCreateNew}>
                      <Save className="h-3 w-3" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setIsCreating(false)}>
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            )}
            
            {sortedMonths.map((monthKey) => {
              const monthPosts = groupedPosts[monthKey];
              const monthDate = new Date(monthKey + '-01');
              
              return (
                <React.Fragment key={monthKey}>
                  {/* Month Header */}
                  <TableRow>
                    <TableCell colSpan={7} className="bg-muted/50 font-semibold text-foreground py-3">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        {format(monthDate, 'MMMM yyyy')}
                        <span className="text-sm font-normal text-muted-foreground ml-2">
                          ({monthPosts.length} post{monthPosts.length !== 1 ? 's' : ''})
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                  
                  {/* Posts for this month */}
                  {monthPosts
                    .sort((a, b) => new Date(a.scheduled_date).getTime() - new Date(b.scheduled_date).getTime())
                    .map((post) => {
                      const postDate = new Date(post.scheduled_date);
                      
                      return (
                        <TableRow key={post.id} className="hover:bg-muted/25">
                          <TableCell>
                            <div className="flex items-center gap-2">
                               {post.image_url ? (
                                 <img 
                                   src={post.image_url} 
                                   alt="Post image" 
                                   className="w-10 h-10 rounded object-cover cursor-pointer hover:opacity-80 transition-opacity"
                                   onClick={() => document.getElementById(`image-upload-${post.id}`)?.click()}
                                   onMouseEnter={(e) => handleImageHover(e, post.image_url!)}
                                   onMouseLeave={handleImageLeave}
                                 />
                              ) : (
                                <div 
                                  className="w-10 h-10 border-2 border-dashed border-gray-300 rounded flex items-center justify-center cursor-pointer hover:border-gray-400"
                                  onClick={() => document.getElementById(`image-upload-${post.id}`)?.click()}
                                >
                                  <ImageIcon className="h-4 w-4 text-gray-400" />
                                </div>
                              )}
                              {uploadingImage === post.id && (
                                <div className="text-xs text-muted-foreground">Uploading...</div>
                              )}
                              <input
                                id={`image-upload-${post.id}`}
                                type="file"
                                accept="image/*"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    handleImageUpload(post.id, file);
                                  }
                                }}
                                className="hidden"
                              />
                            </div>
                          </TableCell>
                          <TableCell>
                            {renderEditableCell(post, 'title', post.title, 'input')}
                          </TableCell>
                          <TableCell>
                            {renderEditableCell(post, 'content', post.content, 'textarea')}
                          </TableCell>
                          <TableCell>
                            {renderEditableCell(post, 'platform', post.platform, 'select')}
                          </TableCell>
                          <TableCell>
                            {renderEditableCell(post, 'status', post.status, 'select')}
                          </TableCell>
          <TableCell>
            <div className="space-y-1">
              <div 
                onClick={() => handleEdit(post.id, 'scheduled_date')}
                className="cursor-pointer hover:bg-muted/50 p-1 rounded min-h-[32px] flex items-center"
              >
                {editingField?.postId === post.id && editingField?.field === 'scheduled_date' ? (
                  <Input
                    type="date"
                    value={format(new Date(post.scheduled_date), 'yyyy-MM-dd')}
                    onChange={(e) => {
                      const newDate = new Date(e.target.value);
                      const originalDate = new Date(post.scheduled_date);
                      newDate.setHours(originalDate.getHours(), originalDate.getMinutes());
                      const updatedValue = newDate.toISOString();
                      updatePost(post.id, 'scheduled_date', updatedValue);
                    }}
                    onBlur={() => handleSaveField(post.id, 'scheduled_date', posts.find(p => p.id === post.id)?.scheduled_date || post.scheduled_date)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleSaveField(post.id, 'scheduled_date', posts.find(p => p.id === post.id)?.scheduled_date || post.scheduled_date);
                      }
                      if (e.key === 'Escape') {
                        setEditingField(null);
                      }
                    }}
                    autoFocus
                    className="min-w-[140px]"
                  />
                ) : (
                  <div className="text-sm">{format(new Date(post.scheduled_date), 'MMM d, yyyy')}</div>
                )}
              </div>
              <div 
                onClick={() => handleEdit(post.id, 'scheduled_time')}
                className="cursor-pointer hover:bg-muted/50 p-1 rounded min-h-[32px] flex items-center"
              >
                {editingField?.postId === post.id && editingField?.field === 'scheduled_time' ? (
                  <Input
                    type="time"
                    value={format(new Date(post.scheduled_date), 'HH:mm')}
                    onChange={(e) => {
                      const [hours, minutes] = e.target.value.split(':').map(Number);
                      const newDate = new Date(post.scheduled_date);
                      newDate.setHours(hours, minutes);
                      const updatedValue = newDate.toISOString();
                      updatePost(post.id, 'scheduled_date', updatedValue);
                    }}
                    onBlur={() => handleSaveField(post.id, 'scheduled_date', posts.find(p => p.id === post.id)?.scheduled_date || post.scheduled_date)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleSaveField(post.id, 'scheduled_date', posts.find(p => p.id === post.id)?.scheduled_date || post.scheduled_date);
                      }
                      if (e.key === 'Escape') {
                        setEditingField(null);
                      }
                    }}
                    autoFocus
                    className="min-w-[100px]"
                  />
                ) : (
                  <div className="text-sm text-muted-foreground">{format(new Date(post.scheduled_date), 'HH:mm')}</div>
                )}
              </div>
            </div>
          </TableCell>
                          <TableCell>
                            <Button size="sm" variant="outline" onClick={() => handleDelete(post.id)}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                </React.Fragment>
              );
            })}
            
            {sortedMonths.length === 0 && !isCreating && (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No posts found. Create your first post!
                </TableCell>
              </TableRow>
            )}
          </TableBody>
          </Table>
        </ScrollArea>
      </div>

      {/* Hover Image Preview */}
      {hoverImage.isVisible && (
        <div 
          className="fixed z-50 pointer-events-none"
          style={{
            left: `${hoverImage.position.x}px`,
            top: `${hoverImage.position.y}px`,
            transform: 'translateY(-50%)'
          }}
        >
          <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-2 max-w-sm">
            <img 
              src={hoverImage.imageUrl} 
              alt="Image preview" 
              className="max-w-80 max-h-80 rounded object-contain"
            />
          </div>
        </div>
      )}
    </div>
  );
};