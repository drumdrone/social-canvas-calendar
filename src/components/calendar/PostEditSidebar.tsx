import React, { useState, useEffect } from 'react';
import { X, Save, Upload, Calendar as CalendarIcon, Clock, Trash2, History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { SocialPost } from '../SocialCalendar';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { PostVersionHistory } from './PostVersionHistory';

interface PostEditSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  post: SocialPost | null;
  onSave: () => void;
}

export const PostEditSidebar: React.FC<PostEditSidebarProps> = ({
  isOpen,
  onClose,
  post,
  onSave,
}) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [platform, setPlatform] = useState('');
  const [status, setStatus] = useState('');
  const [category, setCategory] = useState('');
  const [time, setTime] = useState('12:00');
  const [image, setImage] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [scheduledDate, setScheduledDate] = useState<Date>(new Date());
  const [platformOptions, setPlatformOptions] = useState<string[]>([]);
  const [statusOptions, setStatusOptions] = useState<string[]>([]);
  const [pillar, setPillar] = useState<string>('none');
  const [productLine, setProductLine] = useState<string>('none');
  const [pillarOptions, setPillarOptions] = useState<Array<{name: string, color: string}>>([]);
  const [productLineOptions, setProductLineOptions] = useState<Array<{name: string, color: string}>>([]);
  const [categoryOptions, setCategoryOptions] = useState<Array<{name: string, color: string, format: string}>>([]);
  const [showVersionHistory, setShowVersionHistory] = useState(false);

  // Load options from database
  useEffect(() => {
    const loadOptions = async () => {
      try {
        const [platformsResult, statusesResult, pillarsResult, productLinesResult, categoriesResult] = await Promise.all([
          supabase.from('platforms').select('name').eq('is_active', true).order('name'),
          supabase.from('post_statuses').select('name').eq('is_active', true).order('name'),
          supabase.from('pillars').select('name, color').eq('is_active', true).order('name'),
          supabase.from('product_lines').select('name, color').eq('is_active', true).order('name'),
          supabase.from('categories').select('name, color, format').eq('is_active', true).order('name'),
        ]);
        
        setPlatformOptions(platformsResult.data?.map(p => p.name) || []);
        setStatusOptions(statusesResult.data?.map(s => s.name) || []);
        setPillarOptions(pillarsResult.data || []);
        setProductLineOptions(productLinesResult.data || []);
        setCategoryOptions(categoriesResult.data || []);
      } catch (error) {
        console.error('Error loading options:', error);
      }
    };

    if (isOpen) {
      loadOptions();
    }
  }, [isOpen]);

  // Pre-fill form when post changes
  useEffect(() => {
    if (post) {
      setTitle(post.title);
      setContent(post.content || '');
      setPlatform(post.platform);
      setStatus(post.status);
      setCategory(post.category);
      setPillar((post as any).pillar || 'none');
      setProductLine((post as any).product_line || 'none');
      
      const postDate = new Date(post.scheduled_date);
      setScheduledDate(postDate);
      setTime(format(postDate, 'HH:mm'));
    }
  }, [post]);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setImage(file);
    }
  };

  const uploadImage = async (file: File) => {
    const fileExt = file.name.split('.').pop() || 'png';
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${fileExt}`;
    const filePath = `public/${fileName}`;

    const { data, error } = await supabase.storage
      .from('social-media-images')
      .upload(filePath, file);

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
      .from('social-media-images')
      .getPublicUrl(filePath);

    return publicUrl;
  };

  const handleSave = async () => {
    if (!post || !title.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    setUploading(true);

    try {
      let imageUrl = post.image_url;
      
      if (image) {
        imageUrl = await uploadImage(image);
      }

      const scheduledDateTime = new Date(scheduledDate);
      const [hours, minutes] = time.split(':').map(Number);
      scheduledDateTime.setHours(hours, minutes, 0, 0);

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
          pillar: pillar && pillar !== 'none' ? pillar : null,
          product_line: productLine && productLine !== 'none' ? productLine : null,
        })
        .eq('id', post.id);

      if (error) throw error;

      toast.success('Post updated successfully!');
      onSave();
      onClose();
    } catch (error) {
      console.error('Error updating post:', error);
      toast.error('Failed to update post');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!post || !confirm('Are you sure you want to delete this post?')) return;

    try {
      const { error } = await supabase
        .from('social_media_posts')
        .delete()
        .eq('id', post.id);

      if (error) throw error;

      toast.success('Post deleted successfully!');
      onSave();
      onClose();
    } catch (error) {
      console.error('Error deleting post:', error);
      toast.error('Failed to delete post');
    }
  };

  if (!isOpen || !post) return null;

  return (
    <div className="fixed right-0 top-0 h-screen w-96 bg-background border-l border-border shadow-lg z-50 overflow-y-auto">
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Edit Post</h2>
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setShowVersionHistory(true)}
              title="View version history"
            >
              <History className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Post title"
            />
          </div>

          <div>
            <Label htmlFor="content">Content</Label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Post content"
              rows={4}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="platform">Platform</Label>
              <Select value={platform} onValueChange={setPlatform}>
                <SelectTrigger>
                  <SelectValue placeholder="Select platform" />
                </SelectTrigger>
                <SelectContent>
                  {platformOptions.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="status">Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="category">Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categoryOptions.map((c) => (
                  <SelectItem key={c.name} value={c.name}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="pillar">Pillar</Label>
              <Select value={pillar} onValueChange={setPillar}>
                <SelectTrigger>
                  <SelectValue placeholder="Select pillar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {pillarOptions.map((p) => (
                    <SelectItem key={p.name} value={p.name}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="productLine">Product Line</Label>
              <Select value={productLine} onValueChange={setProductLine}>
                <SelectTrigger>
                  <SelectValue placeholder="Select product line" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {productLineOptions.map((p) => (
                    <SelectItem key={p.name} value={p.name}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Scheduled Date</Label>
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
                    {scheduledDate ? format(scheduledDate, 'MMM d, yyyy') : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <CalendarComponent
                    mode="single"
                    selected={scheduledDate}
                    onSelect={(date) => date && setScheduledDate(date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <Label htmlFor="time">Time</Label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="time"
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>

          <div>
            <Label htmlFor="image">Upload New Image</Label>
            <div className="mt-1">
              <Input
                id="image"
                type="file"
                onChange={handleImageUpload}
                accept="image/*"
                className="file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-sm file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
              />
            </div>
            {post.image_url && (
              <div className="mt-2">
                <img 
                  src={post.image_url} 
                  alt="Current post image" 
                  className="w-full h-32 object-cover rounded border"
                />
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-2 pt-4 border-t">
          <Button onClick={handleSave} disabled={uploading} className="flex-1">
            <Save className="h-4 w-4 mr-2" />
            {uploading ? 'Saving...' : 'Save Changes'}
          </Button>
          <Button variant="destructive" onClick={handleDelete} size="sm">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      <PostVersionHistory
        postId={post?.id || null}
        isOpen={showVersionHistory}
        onClose={() => setShowVersionHistory(false)}
        onRestore={() => {
          onSave(); // Refresh the calendar
          onClose(); // Close the sidebar
        }}
      />
    </div>
  );
};