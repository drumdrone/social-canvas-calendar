import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Facebook, Instagram, Twitter, Linkedin, Upload, Calendar, Clock, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { Platform, PostStatus } from '../SocialCalendar';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface PostModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: Date | null;
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
}) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [platform, setPlatform] = useState<Platform>('facebook');
  const [status, setStatus] = useState<PostStatus>('draft');
  const [time, setTime] = useState('12:00');
  const [image, setImage] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [existingPosts, setExistingPosts] = useState<any[]>([]);
  const [deleting, setDeleting] = useState<string | null>(null);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setImage(file);
    }
  };

  const uploadImage = async (file: File) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
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
    
    if (!selectedDate || !title.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    setUploading(true);

    try {
      let imageUrl = null;
      
      if (image) {
        imageUrl = await uploadImage(image);
      }

      const scheduledDateTime = new Date(selectedDate);
      const [hours, minutes] = time.split(':').map(Number);
      scheduledDateTime.setHours(hours, minutes, 0, 0);

      const { error } = await supabase
        .from('social_media_posts')
        .insert([
          {
            title: title.trim(),
            content: content.trim() || null,
            platform,
            status,
            image_url: imageUrl,
            scheduled_date: scheduledDateTime.toISOString(),
            user_id: '00000000-0000-0000-0000-000000000000', // Temporary until auth is implemented
          },
        ]);

      if (error) {
        throw error;
      }

      toast.success('Post created successfully!');
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

  React.useEffect(() => {
    if (isOpen && selectedDate) {
      fetchExistingPosts();
    }
  }, [isOpen, selectedDate]);

  const handleClose = () => {
    setTitle('');
    setContent('');
    setPlatform('facebook');
    setStatus('draft');
    setTime('12:00');
    setImage(null);
    onClose();
  };

  if (!selectedDate) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Posts for {format(selectedDate, 'MMMM d, yyyy')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 max-h-96 overflow-y-auto">
          {/* Existing Posts */}
          {existingPosts.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-medium text-sm">Existing Posts</h3>
              {existingPosts.map((post) => {
                const Icon = platformIcons[post.platform as Platform];
                return (
                  <div key={post.id} className="flex items-center gap-2 p-2 border rounded-md">
                    <Icon className="h-4 w-4" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{post.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {post.platform} • {post.status} • {format(new Date(post.scheduled_date), 'HH:mm')}
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
                      onClick={() => handleDeletePost(post.id)}
                      disabled={deleting === post.id}
                      className="h-8 w-8 p-0"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Create New Post Form */}
          <div className="border-t pt-4">
            <h3 className="font-medium text-sm mb-4">Create New Post</h3>
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
                      {(['facebook', 'instagram', 'twitter', 'linkedin'] as Platform[]).map((p) => {
                        const Icon = platformIcons[p];
                        return (
                          <SelectItem key={p} value={p}>
                            <div className="flex items-center gap-2">
                              <Icon className="h-4 w-4" />
                              {p.charAt(0).toUpperCase() + p.slice(1)}
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
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="scheduled">Scheduled</SelectItem>
                      <SelectItem value="published">Published</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
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
                    {image ? 'Change Image' : 'Upload Image'}
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
                  {uploading ? 'Creating...' : 'Create Post'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};