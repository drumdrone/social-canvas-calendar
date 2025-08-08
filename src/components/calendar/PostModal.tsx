import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Facebook, Instagram, Twitter, Linkedin, Upload, Calendar, Clock, Trash2, CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { Platform, PostStatus, SocialPost, Category } from '../SocialCalendar';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface PostModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: Date | null;
  editingPost?: SocialPost | null;
}

const platformIcons = {
  facebook: Facebook,
  instagram: Instagram,
  twitter: Twitter,
  linkedin: Linkedin,
};

export const PostModal: React.FC<PostModalProps> = ({
  isOpen,
  onClose,
  selectedDate,
  editingPost,
}) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [platform, setPlatform] = useState<Platform>('facebook');
  const [status, setStatus] = useState<PostStatus>('draft');
  const [category, setCategory] = useState<Category>('Image');
  const [time, setTime] = useState('12:00');
  const [image, setImage] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [existingPosts, setExistingPosts] = useState<any[]>([]);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [currentEditingPost, setCurrentEditingPost] = useState<SocialPost | null>(editingPost || null);
  const [scheduledDate, setScheduledDate] = useState<Date>(selectedDate || new Date());
  const [platformOptions, setPlatformOptions] = useState<string[]>([]);
  const [statusOptions, setStatusOptions] = useState<string[]>([]);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setImage(file);
    }
  };

  const uploadImage = async (file: File) => {
    const inferredExt = (file.name && file.name.includes('.')) ? file.name.split('.').pop() : (file.type ? file.type.split('/').pop() : 'png');
    const fileExt = inferredExt || 'png';
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${fileExt}`;
    const filePath = `public/${fileName}`;

    const { data, error } = await supabase.storage
      .from('social-media-images')
      .upload(filePath, file);

    if (error) {
      throw error;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('social-media-images')
      .getPublicUrl(filePath);

    return publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!scheduledDate || !title.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    setUploading(true);

    try {
      let imageUrl = null;
      
      if (image) {
        imageUrl = await uploadImage(image);
      } else if (editingPost || currentEditingPost) {
        // Keep existing image URL if no new image is uploaded
        imageUrl = (editingPost || currentEditingPost)?.image_url;
      }

      const scheduledDateTime = new Date(scheduledDate);
      const [hours, minutes] = time.split(':').map(Number);
      scheduledDateTime.setHours(hours, minutes, 0, 0);

      if (editingPost || currentEditingPost) {
        // Update existing post
        const { error } = await supabase
          .from('social_media_posts')
          .update({
            title: title.trim(),
            content: content.trim() || null,
            platform,
            status,
            category,
            image_url: imageUrl,
            scheduled_date: scheduledDateTime.toISOString(),
          })
          .eq('id', (editingPost || currentEditingPost)!.id);

        if (error) {
          throw error;
        }

        toast.success('Post updated successfully!');
      } else {
        // Create new post
        const { error } = await supabase
          .from('social_media_posts')
          .insert([
            {
              title: title.trim(),
              content: content.trim() || null,
              platform,
              status,
              category,
              image_url: imageUrl,
              scheduled_date: scheduledDateTime.toISOString(),
              user_id: '00000000-0000-0000-0000-000000000000',
            },
          ]);

        if (error) {
          throw error;
        }

        toast.success('Post created successfully!');
      }
      handleClose();
      
      // Refresh the page to show the new post
      window.location.reload();
    } catch (error) {
      console.error('Error creating post:', error);
      toast.error('Failed to create post. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleDeletePost = async (postId: string) => {
    setDeleting(postId);
    
    try {
      const { error } = await supabase
        .from('social_media_posts')
        .delete()
        .eq('id', postId);

      if (error) {
        throw error;
      }

      toast.success('Post deleted successfully!');
      await fetchExistingPosts();
      window.location.reload();
    } catch (error) {
      console.error('Error deleting post:', error);
      toast.error('Failed to delete post. Please try again.');
    } finally {
      setDeleting(null);
    }
  };

  const fetchExistingPosts = async () => {
    if (!selectedDate) return;
    
    const startOfDay = new Date(selectedDate);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(selectedDate);
    endOfDay.setHours(23, 59, 59, 999);

    const { data, error } = await supabase
      .from('social_media_posts')
      .select('*')
      .gte('scheduled_date', startOfDay.toISOString())
      .lte('scheduled_date', endOfDay.toISOString())
      .order('scheduled_date', { ascending: true });

    if (!error && data) {
      setExistingPosts(data);
    }
  };

  // Load dynamic platform and status options from Supabase and sync defaults
  React.useEffect(() => {
    const loadOptions = async () => {
      try {
        const [platformsResult, statusesResult] = await Promise.all([
          supabase.from('platforms').select('name').eq('is_active', true).order('name', { ascending: true }),
          supabase.from('post_statuses').select('name').eq('is_active', true).order('name', { ascending: true }),
        ]);
        const platforms = platformsResult.data?.map(p => p.name) || [];
        const statuses = statusesResult.data?.map(s => s.name) || [];
        setPlatformOptions(platforms);
        setStatusOptions(statuses);
        if (!(editingPost || currentEditingPost)) {
          if (platforms.length && !platforms.includes(platform)) setPlatform(platforms[0]);
          if (statuses.length && !statuses.includes(status)) setStatus(statuses[0]);
        }
      } catch (e) {
        console.error('Failed to load platform/status options', e);
      }
    };

    if (isOpen) {
      loadOptions();
    }
  }, [isOpen, editingPost, currentEditingPost, platform, status]);

  // Refresh options when settings change elsewhere
  React.useEffect(() => {
    const handler = () => {
      if (isOpen) {
        (async () => {
          try {
            const [platformsResult, statusesResult] = await Promise.all([
              supabase.from('platforms').select('name').eq('is_active', true).order('name', { ascending: true }),
              supabase.from('post_statuses').select('name').eq('is_active', true).order('name', { ascending: true }),
            ]);
            setPlatformOptions(platformsResult.data?.map(p => p.name) || []);
            setStatusOptions(statusesResult.data?.map(s => s.name) || []);
          } catch (e) {
            console.error('Failed to refresh options after settings change', e);
          }
        })();
      }
    };
    window.addEventListener('settingsChanged', handler);
    return () => window.removeEventListener('settingsChanged', handler);
  }, [isOpen]);

  // Allow pasting image from clipboard when modal is open
  React.useEffect(() => {
    if (!isOpen) return;
    const onPaste = (e: any) => {
      const items = e.clipboardData?.items || [];
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item && item.type && item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) {
            setImage(file);
            toast.success('Image pasted from clipboard');
            break;
          }
        }
      }
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [isOpen]);

  React.useEffect(() => {
    if (isOpen && selectedDate) {
      setScheduledDate(selectedDate);
      fetchExistingPosts();
      
      // Clear currentEditingPost when opening modal for new posts
      if (!editingPost) {
        setCurrentEditingPost(null);
      }
    }
    
    // Pre-fill form when editing
    if (editingPost) {
      setCurrentEditingPost(editingPost);
      setTitle(editingPost.title);
      setContent(editingPost.content || '');
      setPlatform(editingPost.platform);
      setStatus(editingPost.status);
      setCategory(editingPost.category);
      
      const postDate = new Date(editingPost.scheduled_date);
      setScheduledDate(postDate);
      setTime(format(postDate, 'HH:mm'));
    }
  }, [isOpen, selectedDate, editingPost]);

  const handleClose = () => {
    setTitle('');
    setContent('');
    setPlatform('facebook');
    setStatus('draft');
    setCategory('Image');
    setTime('12:00');
    setImage(null);
    setCurrentEditingPost(null);
    setScheduledDate(selectedDate || new Date());
    onClose();
  };

  if (!selectedDate) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            {(editingPost || currentEditingPost) ? 'Edit Post' : `Posts for ${format(scheduledDate, 'MMMM d, yyyy')}`}
          </DialogTitle>
          <DialogDescription>
            {(editingPost || currentEditingPost) ? 'Modify your existing post details' : 'Create new posts or edit existing ones for this date'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 max-h-96 overflow-y-auto">
          {/* Show existing posts only when not editing */}
          {!(editingPost || currentEditingPost) && existingPosts.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-medium text-sm">Existing Posts</h3>
              {existingPosts.map((post) => {
                const Icon = platformIcons[post.platform as Platform] || Calendar;
                return (
                  <div key={post.id} className="flex items-center gap-2 p-3 border rounded-md hover:bg-muted/50 transition-colors">
                    <Icon className="h-4 w-4" />
                    <div 
                      className="flex-1 min-w-0 cursor-pointer"
                      onClick={() => {
                        setCurrentEditingPost(post);
                        // Pre-fill form immediately
                        setTitle(post.title);
                        setContent(post.content || '');
                        setPlatform(post.platform);
                        setStatus(post.status);
                        setCategory(post.category);
                        const postDate = new Date(post.scheduled_date);
                        setTime(format(postDate, 'HH:mm'));
                      }}
                    >
                      <p className="font-medium text-sm truncate hover:text-primary">{post.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {post.platform} • {post.category} • {post.status} • {format(new Date(post.scheduled_date), 'HH:mm')} • Click to edit
                      </p>
                    </div>
                    {post.image_url && (
                      <img 
                        src={post.image_url} 
                        alt="Post thumbnail" 
                        className="w-8 h-8 rounded object-cover"
                      />
                    )}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeletePost(post.id);
                      }}
                      disabled={deleting === post.id}
                      className="h-8 w-8 p-0 hover:bg-destructive hover:text-destructive-foreground"
                      title="Delete post"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Form Section */}
          <div className={!(editingPost || currentEditingPost) && existingPosts.length > 0 ? "border-t pt-4" : ""}>
            {(editingPost || currentEditingPost) && (
              <div className="flex items-center gap-2 mb-4 p-2 bg-muted/50 rounded-md">
                <Calendar className="h-4 w-4" />
                <span className="text-sm font-medium">Editing: {(editingPost || currentEditingPost)?.title}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setCurrentEditingPost(null);
                    handleClose();
                  }}
                  className="ml-auto h-6 w-6 p-0"
                >
                  ×
                </Button>
              </div>
            )}
            
            {/* Show existing image thumbnail when editing */}
            {(editingPost || currentEditingPost) && (editingPost || currentEditingPost)?.image_url && (
              <div className="mb-4">
                <img 
                  src={(editingPost || currentEditingPost)?.image_url} 
                  alt="Current post image" 
                  className="w-full aspect-square rounded-md object-cover border"
                />
                <p className="text-xs text-muted-foreground mt-1">Current image</p>
              </div>
            )}
            
            <h3 className="font-medium text-sm mb-4">
              {(editingPost || currentEditingPost) ? 'Edit Post' : 'Create New Post'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter post title..."
                  required
                />
              </div>

              <div>
                <Label htmlFor="content">Content</Label>
                <Textarea
                  id="content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Write your post content..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="platform">Platform</Label>
                  <Select value={platform} onValueChange={(value: Platform) => setPlatform(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {platformOptions.map((p) => {
                        const Icon = platformIcons[p as Platform];
                        return (
                          <SelectItem key={p} value={p}>
                            <div className="flex items-center gap-2">
                              {Icon ? <Icon className="h-4 w-4" /> : null}
                              {p}
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select value={status} onValueChange={(value: PostStatus) => setStatus(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {statusOptions.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="category">Category</Label>
                <Select value={category} onValueChange={(value: Category) => setCategory(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Video">Video</SelectItem>
                    <SelectItem value="Image">Image</SelectItem>
                    <SelectItem value="Carousel">Carousel</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="date">Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !scheduledDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {scheduledDate ? format(scheduledDate, "PPP") : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={scheduledDate}
                        onSelect={(date) => date && setScheduledDate(date)}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div>
                  <Label htmlFor="time">Time</Label>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <Input
                      id="time"
                      type="time"
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div>
                <Label htmlFor="image">Image</Label>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => document.getElementById('image-upload')?.click()}
                    className="flex items-center gap-2"
                  >
                    <Upload className="h-4 w-4" />
                    {image ? 'Change Image' : (editingPost || currentEditingPost)?.image_url ? 'Replace Image' : 'Upload Image'}
                  </Button>
                  {image && (
                    <span className="text-sm text-muted-foreground truncate">
                      {image.name}
                    </span>
                  )}
                </div>
                <input
                  id="image-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button type="button" variant="outline" onClick={handleClose} className="flex-1">
                  Cancel
                </Button>
                <Button type="submit" disabled={uploading} className="flex-1">
                  {uploading ? ((editingPost || currentEditingPost) ? 'Updating...' : 'Creating...') : ((editingPost || currentEditingPost) ? 'Update Post' : 'Create Post')}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};