import React, { useState, useEffect } from 'react';
import { X, Save, Upload, Calendar as CalendarIcon, Clock, Trash2, History, Plus, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format } from 'date-fns';
import { SocialPost } from '../SocialCalendar';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { PostVersionHistory } from './PostVersionHistory';

interface PostSlidingSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  post?: SocialPost | null;
  selectedDate?: Date | null;
  onSave: () => void;
}

export const PostSlidingSidebar: React.FC<PostSlidingSidebarProps> = ({
  isOpen,
  onClose,
  post,
  selectedDate,
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
  const [authorOptions, setAuthorOptions] = useState<Array<{initials: string, name: string, color: string}>>([]);
  const [author, setAuthor] = useState<string>('');
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [comments, setComments] = useState('');
  const [activeTab, setActiveTab] = useState('content');
  const { toast } = useToast();

  // Load options from database
  useEffect(() => {
    const loadOptions = async () => {
      try {
        const [platformsResult, statusesResult, pillarsResult, productLinesResult, categoriesResult, authorsResult] = await Promise.all([
          supabase.from('platforms').select('name').eq('is_active', true).order('name'),
          supabase.from('post_statuses').select('name').eq('is_active', true).order('name'),
          supabase.from('pillars').select('name, color').eq('is_active', true).order('name'),
          supabase.from('product_lines').select('name, color').eq('is_active', true).order('name'),
          supabase.from('categories').select('name, color, format').eq('is_active', true).order('name'),
          supabase.from('authors').select('initials, name, color').eq('is_active', true).order('name'),
        ]);
        
        const platforms = platformsResult.data?.map(p => p.name) || [];
        const statuses = statusesResult.data?.map(s => s.name) || [];
        
        setPlatformOptions(platforms);
        setStatusOptions(statuses);
        setPillarOptions(pillarsResult.data || []);
        setProductLineOptions(productLinesResult.data || []);
        setCategoryOptions(categoriesResult.data || []);
        setAuthorOptions(authorsResult.data || []);

        // Set defaults for new posts
        if (!post) {
          if (platforms.length && !platform) setPlatform(platforms[0]);
          if (statuses.length && !status) setStatus(statuses[0]);
          if (!category) setCategory('Image');
        }
      } catch (error) {
        console.error('Error loading options:', error);
      }
    };

    if (isOpen) {
      console.log('PostSlidingSidebar opened, loading options...');
      loadOptions();
    }
  }, [isOpen, post, platform, status, category]);

  // Pre-fill form when post changes
  useEffect(() => {
    console.log('PostSlidingSidebar post changed:', post);
    if (post) {
      console.log('Setting form data for editing:', {
        title: post.title,
        content: post.content,
        platform: post.platform,
        status: post.status,
        category: post.category,
        pillar: (post as any).pillar,
        product_line: (post as any).product_line
      });
      
      setTitle(post.title);
      setContent(post.content || '');
      setPlatform(post.platform);
      setStatus(post.status);
      setCategory(post.category);
      setPillar((post as any).pillar || 'none');
      setProductLine((post as any).product_line || 'none');
      setAuthor(post.author || '');
      setComments((post as any).comments || '');
      
      const postDate = new Date(post.scheduled_date);
      setScheduledDate(postDate);
      setTime(format(postDate, 'HH:mm'));
    } else if (selectedDate) {
      console.log('Resetting form for new post on date:', selectedDate);
      // Reset form for new post
      setTitle('');
      setContent('');
      setPillar('none');
      setProductLine('none');
      setAuthor('');
      setScheduledDate(selectedDate);
      setTime('12:00');
      setImage(null);
      setComments('');
    }
  }, [post, selectedDate]);

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

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
      .from('social-media-images')
      .getPublicUrl(filePath);

    return publicUrl;
  };

  const handleSave = async () => {
    if (!title.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a title',
        variant: 'destructive',
      });
      return;
    }

    setUploading(true);

    try {
      let imageUrl = post?.image_url || null;
      
      if (image) {
        imageUrl = await uploadImage(image);
      }

      const scheduledDateTime = new Date(scheduledDate);
      const [hours, minutes] = time.split(':').map(Number);
      scheduledDateTime.setHours(hours, minutes, 0, 0);

      const postData = {
        title: title.trim(),
        content: content.trim() || null,
        platform,
        status,
        category,
        image_url: imageUrl,
        scheduled_date: scheduledDateTime.toISOString(),
        pillar: pillar && pillar !== 'none' ? pillar : null,
        product_line: productLine && productLine !== 'none' ? productLine : null,
        author: author || null,
      };

      if (post) {
        // Update existing post
        const { error } = await supabase
          .from('social_media_posts')
          .update(postData)
          .eq('id', post.id);

        if (error) throw error;
        toast({
          title: 'Success',
          description: 'Post updated successfully!',
        });
      } else {
        // Create new post
        const { error } = await supabase
          .from('social_media_posts')
          .insert([postData]);

        if (error) throw error;
        toast({
          title: 'Success',
          description: 'Post created successfully!',
        });
      }

      onSave();
      onClose();
    } catch (error) {
      console.error('Error saving post:', error);
      toast({
        title: 'Error',
        description: 'Failed to save post',
        variant: 'destructive',
      });
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

      toast({
        title: 'Success',
        description: 'Post deleted successfully!',
      });
      onSave();
      onClose();
    } catch (error) {
      console.error('Error deleting post:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete post',
        variant: 'destructive',
      });
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity duration-300"
        onClick={onClose}
      />
      
      {/* Sliding Sidebar */}
      <div className={cn(
        "fixed top-0 right-0 h-screen w-1/3 min-w-[400px] max-w-[600px] bg-background border-l border-border shadow-2xl z-50 transition-transform duration-300 ease-out",
        isOpen ? "translate-x-0" : "translate-x-full"
      )}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-border">
            <div className="flex items-center gap-3">
              {post ? (
                <CalendarIcon className="h-5 w-5 text-primary" />
              ) : (
                <Plus className="h-5 w-5 text-primary" />
              )}
              <div>
                <h2 className="text-xl font-semibold">
                  {post ? 'Edit Post' : 'Create New Post'}
                </h2>
                {selectedDate && !post && (
                  <p className="text-sm text-muted-foreground">
                    {format(selectedDate, 'MMMM d, yyyy')}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {post && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setShowVersionHistory(true)}
                  title="View version history"
                  className="text-muted-foreground hover:text-foreground"
                >
                  <History className="h-4 w-4" />
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-hidden flex flex-col">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
              <div className="px-6 pt-4 flex-shrink-0">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="content" className="flex items-center gap-2">
                    <CalendarIcon className="h-4 w-4" />
                    Content
                  </TabsTrigger>
                  <TabsTrigger value="comments" className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Comments
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="content" className="flex-1 overflow-hidden mt-0">
                <ScrollArea className="h-full">
                  <div className="p-6 space-y-6 pb-20">
                    {/* Current Image Preview */}
                    {post?.image_url && (
                      <div className="space-y-2">
                        <Label>Current Image</Label>
                        <div className="relative cursor-pointer group h-80 overflow-hidden rounded-lg border" onClick={() => document.getElementById('image-upload')?.click()}>
                          <img 
                            src={post.image_url} 
                            alt="Current post image" 
                            className="w-full h-full object-cover group-hover:opacity-80 transition-opacity"
                          />
                          <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/20 transition-colors">
                            <Upload className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground">Click image to replace</p>
                      </div>
                    )}

                    {/* Title */}
                    <div className="space-y-2">
                      <Label htmlFor="title" className="text-sm font-medium">
                        Title *
                      </Label>
                      <Input
                        id="title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Enter post title..."
                        className="text-base"
                      />
                    </div>

                    {/* Content */}
                    <div className="space-y-2">
                      <Label htmlFor="content" className="text-sm font-medium">
                        Content
                      </Label>
                      <Textarea
                        id="content"
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        placeholder="Write your post content..."
                        rows={6}
                        className="text-base resize-none"
                      />
                    </div>

                    <Separator />

                    {/* Platform and Status */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Platform</Label>
                        <Select value={platform} onValueChange={setPlatform}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select platform" />
                          </SelectTrigger>
                          <SelectContent>
                            {platformOptions.filter(p => p && p.trim() !== '').map((p) => (
                              <SelectItem key={p} value={p}>
                                {p}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Status</Label>
                        <Select value={status} onValueChange={setStatus}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                          <SelectContent>
                            {statusOptions.filter(s => s && s.trim() !== '').map((s) => (
                              <SelectItem key={s} value={s}>
                                {s}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Category */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Category</Label>
                      <Select value={category} onValueChange={setCategory}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                          <SelectContent>
                            {categoryOptions.filter(c => c.name && c.name.trim() !== '').map((c) => (
                              <SelectItem key={c.name} value={c.name}>
                                {c.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Author */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Author</Label>
                      <Select value={author} onValueChange={setAuthor}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select author" />
                        </SelectTrigger>
                        <SelectContent className="bg-background border border-border shadow-lg z-[60]">
                          <SelectItem value="none">None</SelectItem>
                          {authorOptions.filter(a => a.initials && a.initials.trim() !== '').map((a) => (
                            <SelectItem key={a.initials} value={a.initials}>
                              <div className="flex items-center gap-2">
                                <div 
                                  className="w-3 h-3 rounded-full"
                                  style={{ backgroundColor: a.color }}
                                />
                                {a.name} ({a.initials})
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Pillar and Product Line */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Pillar</Label>
                        <Select value={pillar} onValueChange={setPillar}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select pillar" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            {pillarOptions.filter(p => p.name && p.name.trim() !== '').map((p) => (
                              <SelectItem key={p.name} value={p.name}>
                                {p.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Product Line</Label>
                        <Select value={productLine} onValueChange={setProductLine}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select product line" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            {productLineOptions.filter(p => p.name && p.name.trim() !== '').map((p) => (
                              <SelectItem key={p.name} value={p.name}>
                                {p.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <Separator />

                    {/* Date and Time */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Scheduled Date</Label>
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
                          <PopoverContent className="w-auto p-0" align="start">
                            <CalendarComponent
                              mode="single"
                              selected={scheduledDate}
                              onSelect={(date) => date && setScheduledDate(date)}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Time</Label>
                        <div className="relative">
                          <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            type="time"
                            value={time}
                            onChange={(e) => setTime(e.target.value)}
                            className="pl-10"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Image Upload */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">
                        {post?.image_url ? 'Upload New Image' : 'Upload Image'}
                      </Label>
                      <div className="flex flex-col gap-2">
                        <Button
                          variant="outline"
                          className="w-full justify-start h-auto p-3"
                          onClick={() => document.getElementById('image-upload')?.click()}
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          {image ? `Change Image (${image.name})` : 'Choose Image File'}
                        </Button>
                        <Input
                          id="image-upload"
                          type="file"
                          onChange={handleImageUpload}
                          accept="image/*"
                          className="hidden"
                        />
                        {image && (
                          <p className="text-xs text-muted-foreground">
                            Selected: {image.name}
                          </p>
                        )}
                        {post?.image_url && !image && (
                          <div className="mt-2">
                            <img 
                              src={post.image_url} 
                              alt="Current post image" 
                              className="w-full max-w-sm h-32 object-cover rounded border"
                            />
                            <p className="text-xs text-muted-foreground mt-1">Current image</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="comments" className="flex-1 mt-0">
                  <ScrollArea className="h-full">
                    <div className="p-6 space-y-6">
                      <div className="space-y-2">
                        <Label htmlFor="comments" className="text-sm font-medium">
                          Comments & Notes
                        </Label>
                        <Textarea
                          id="comments"
                          value={comments}
                          onChange={(e) => setComments(e.target.value)}
                          placeholder="Add your comments, notes, or ideas about this post..."
                          rows={12}
                          className="text-base resize-none"
                        />
                        <p className="text-sm text-muted-foreground">
                          These comments are for your internal notes only and won't be posted publicly.
                        </p>
                      </div>
                    </div>
                  </ScrollArea>
                </TabsContent>
              </Tabs>
            </div>

            {/* Footer Actions */}
            <div className="border-t border-border p-6">
              <div className="flex gap-3">
                <Button onClick={handleSave} disabled={uploading} className="flex-1">
                  <Save className="h-4 w-4 mr-2" />
                  {uploading ? 'Saving...' : (post ? 'Update Post' : 'Create Post')}
                </Button>
                {post && (
                  <Button variant="destructive" onClick={handleDelete} size="default">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Version History Modal */}
        <PostVersionHistory
          postId={post?.id || null}
          isOpen={showVersionHistory}
          onClose={() => setShowVersionHistory(false)}
          onRestore={() => {
            onSave();
            onClose();
          }}
        />
      </>
    );
  };