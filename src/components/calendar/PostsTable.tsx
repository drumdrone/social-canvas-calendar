import React, { useState, useEffect } from 'react';
import { format, startOfMonth, isSameMonth } from 'date-fns';
import { Facebook, Instagram, Twitter, Linkedin, Calendar, Clock, Trash2, Plus, Save, X, Edit, Upload, Image as ImageIcon, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
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
  const [authorsData, setAuthorsData] = useState<Record<string, { initials: string; color: string }>>({});
  const [loading, setLoading] = useState(true);
  const [availableFormats, setAvailableFormats] = useState<any[]>([]);
  const [availableCategories, setAvailableCategories] = useState<any[]>([]);
  const [availablePillars, setAvailablePillars] = useState<Array<{name: string, color: string}>>([]);
  const [editingField, setEditingField] = useState<EditingField | null>(null);
  const [uploadingImage, setUploadingImage] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [hoverImage, setHoverImage] = useState<HoverImageState>({
    isVisible: false,
    imageUrl: '',
    position: { x: 0, y: 0 }
  });
  const [currentRowIndex, setCurrentRowIndex] = useState(0);
  const [newPost, setNewPost] = useState({
    title: '',
    content: '',
    platform: 'facebook' as Platform,
    status: 'nezahájeno' as PostStatus,
    category: 'Image' as Category,
    pillar: null as string | null,
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

        // Fetch authors data
        const authorInitials = data?.map(post => post.author).filter(Boolean) || [];
        if (authorInitials.length > 0) {
          const { data: authorsData, error: authorsError } = await supabase
            .from('authors')
            .select('initials, color')
            .in('initials', authorInitials);
          
          if (authorsData) {
            const authorsMap = authorsData.reduce((acc, author) => {
              acc[author.initials] = author;
              return acc;
            }, {} as Record<string, { initials: string; color: string }>);
            setAuthorsData(authorsMap);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDynamicData = async () => {
    try {
      const [formatsResult, categoriesResult, pillarsResult] = await Promise.all([
        supabase.from('formats').select('*').eq('is_active', true).order('name'),
        supabase.from('categories').select('*').eq('is_active', true).order('name'),
        supabase.from('pillars').select('name, color').eq('is_active', true).order('name')
      ]);

      if (formatsResult.data) setAvailableFormats(formatsResult.data);
      if (categoriesResult.data) setAvailableCategories(categoriesResult.data);
      if (pillarsResult.data) setAvailablePillars(pillarsResult.data);
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
    // If no filters selected, show all posts
    if (selectedPlatforms.length === 0 && selectedStatuses.length === 0) {
      return true;
    }

    // Show posts that match ANY of the selected filters (OR logic)
    const platformMatch = selectedPlatforms.length === 0 || selectedPlatforms.includes(post.platform);
    const statusMatch = selectedStatuses.length === 0 || selectedStatuses.includes(post.status);

    // Post must match at least one filter category if that category has selections
    if (selectedPlatforms.length > 0 && selectedStatuses.length > 0) {
      // Both filters active: match either platform OR status
      return platformMatch || statusMatch;
    }

    // Only one filter active: must match that filter
    return platformMatch && statusMatch;
  });

  // Enhanced scroll behavior for table row navigation
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (filteredPosts.length === 0) return;

      e.preventDefault();
      
      if (e.deltaY > 0) {
        // Scroll down - go to next row
        setCurrentRowIndex(prev => Math.min(prev + 1, filteredPosts.length - 1));
      } else {
        // Scroll up - go to previous row
        setCurrentRowIndex(prev => Math.max(prev - 1, 0));
      }

      // Scroll the selected row into view
      setTimeout(() => {
        const rowElement = document.querySelector(`[data-row-index="${currentRowIndex}"]`);
        if (rowElement) {
          rowElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
    };

    const tableContainer = document.querySelector('.posts-table-scroll');
    if (tableContainer) {
      tableContainer.addEventListener('wheel', handleWheel, { passive: false });
      return () => tableContainer.removeEventListener('wheel', handleWheel);
    }
  }, [filteredPosts, currentRowIndex]);

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

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const { error } = await supabase
        .from('social_media_posts')
        .insert([{
          title: newPost.title,
          content: newPost.content || null,
          platform: newPost.platform,
          status: newPost.status,
          category: newPost.category,
          pillar: newPost.pillar,
          scheduled_date: scheduledDateTime.toISOString(),
          image_url: imageUrl,
          user_id: user.id,
        }]);

      if (error) throw error;

      toast.success('Post created successfully!');
      setIsCreating(false);
      setNewPost({
        title: '',
        content: '',
        platform: 'facebook',
        status: 'nezahájeno',
        category: 'Image',
        pillar: null,
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

  const handleImageHover = (e: React.MouseEvent, imageUrl: string, comments?: string) => {
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
          if (field === 'category') {
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
                  {availableFormats.map((f) => (
                    <SelectItem key={f.id} value={f.name}>
                      <span className="capitalize">{f.name}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            );
          }
          if (field === 'pillar') {
            return (
              <Select
                value={value || 'none'}
                onValueChange={(newValue) => {
                  const pillarValue = newValue === 'none' ? null : newValue;
                  updatePost(post.id, field, pillarValue);
                  handleSaveField(post.id, field, pillarValue);
                }}
              >
                <SelectTrigger className="min-w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {availablePillars.map((p) => (
                    <SelectItem key={p.name} value={p.name}>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: p.color }}
                        />
                        {p.name}
                      </div>
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
                setEditingField(null);
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
        ) : type === 'select' && field === 'category' ? (
          <div className="flex items-center gap-2">
            <span className="capitalize">{value}</span>
          </div>
        ) : type === 'select' && field === 'pillar' ? (
          value ? (
            <Badge
              className="text-white font-medium text-xs"
              style={{ backgroundColor: availablePillars.find(p => p.name === value)?.color || '#3B82F6' }}
            >
              {value}
            </Badge>
          ) : (
            <span className="text-xs text-muted-foreground">None</span>
          )
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
    <div className="flex-1 overflow-hidden flex flex-col">
      <div className="p-4 flex-shrink-0">
        {/* Enhanced table navigation info */}
        <div className="mb-4 text-sm text-muted-foreground">
          Use scroll wheel to navigate through posts • {filteredPosts.length} posts total
        </div>

        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Social Media Posts</h2>
          <Button onClick={() => setIsCreating(true)} disabled={isCreating}>
            <Plus className="h-4 w-4 mr-2" />
            New Post
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden px-4 pb-4">
        <div className="bg-card rounded-lg border border-border h-full flex flex-col">
          <ScrollArea className="flex-1 posts-table-scroll">
          <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">Image</TableHead>
              <TableHead className="w-[200px]">Title</TableHead>
              <TableHead className="w-[250px]">Content</TableHead>
              <TableHead className="w-[120px]">Format</TableHead>
              <TableHead className="w-[120px]">Pillar</TableHead>
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
                  <Select value={newPost.category} onValueChange={(value: Category) => setNewPost({...newPost, category: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {availableFormats.map((format) => (
                        <SelectItem key={format.id} value={format.name}>
                          <span className="capitalize">{format.name}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <Select value={newPost.pillar || 'none'} onValueChange={(value: string) => setNewPost({...newPost, pillar: value === 'none' ? null : value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {availablePillars.map((p) => (
                        <SelectItem key={p.name} value={p.name}>
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: p.color }}
                            />
                            {p.name}
                          </div>
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
                                    onMouseEnter={(e) => {
                                      if ((post as any).comments) {
                                        e.currentTarget.title = (post as any).comments;
                                      }
                                    }}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.removeAttribute('title');
                                    }}
                                    onError={(e) => {
                                      // Hide broken image and show placeholder instead
                                      e.currentTarget.style.display = 'none';
                                      const placeholder = e.currentTarget.nextElementSibling as HTMLElement;
                                      if (placeholder) placeholder.style.display = 'flex';
                                    }}
                                  />
                              ) : null}
                              <div
                                className="w-10 h-10 border-2 border-dashed border-gray-300 rounded flex items-center justify-center cursor-pointer hover:border-gray-400"
                                style={{ display: post.image_url ? 'none' : 'flex' }}
                                onClick={() => document.getElementById(`image-upload-${post.id}`)?.click()}
                              >
                                <ImageIcon className="h-4 w-4 text-gray-400" />
                              </div>
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
                            <div className="flex items-center gap-2">
                              {renderEditableCell(post, 'title', post.title, 'input')}
                              {post.author && authorsData[post.author] && (
                                <Badge 
                                  className="text-white font-bold text-xs rounded-full w-5 h-5 flex items-center justify-center p-0 text-[9px] flex-shrink-0"
                                  style={{ backgroundColor: authorsData[post.author].color }}
                                >
                                  {authorsData[post.author].initials}
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                <TableCell>
                  {renderEditableCell(post, 'content', post.content, 'textarea')}
                </TableCell>
                <TableCell>
                  {renderEditableCell(post, 'category', post.category, 'select')}
                </TableCell>
                <TableCell>
                  {renderEditableCell(post, 'pillar', (post as any).pillar, 'select')}
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
                             <div className="flex gap-1">
                               <Button 
                                 size="sm" 
                                 variant="outline" 
                                 onClick={() => {
                                   const shareableUrl = `${window.location.origin}/post/${post.id}`;
                                   navigator.clipboard.writeText(shareableUrl);
                                   toast.success('Share link copied to clipboard!');
                                 }}
                               >
                                 <Share2 className="h-3 w-3" />
                               </Button>
                               <Button size="sm" variant="outline" onClick={() => handleDelete(post.id)}>
                                 <Trash2 className="h-3 w-3" />
                               </Button>
                             </div>
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