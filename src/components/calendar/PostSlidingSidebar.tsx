import React, { useState, useEffect } from 'react';
import { X, Save, Upload, Calendar as CalendarIcon, Clock, Trash2, Plus, MessageSquare, Edit3, Check } from 'lucide-react';
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
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { socialPostToConvexPatch } from '@/integrations/convex/adapter';
import { useUploadImage } from '@/integrations/convex/useUploadImage';
import type { Id } from '../../../convex/_generated/dataModel';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { MultiImageUpload } from './MultiImageUpload';
import { CommentEditor } from '../comments/CommentEditor';
import { CommentList } from '../comments/CommentList';

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
  const [postImages, setPostImages] = useState<(string | null)[]>([null, null, null]);
  // Storage ids for images uploaded to Convex during this editing session.
  // Kept in sync with `postImages` so the saved post gets the stable id, not
  // just the (Convex-signed) URL. Existing images loaded from the post keep
  // whatever id already lives on the document — see `postData` in handleSave.
  const [postImageStorageIds, setPostImageStorageIds] = useState<
    (Id<'_storage'> | null)[]
  >([null, null, null]);
  const [uploading, setUploading] = useState(false);
  const createPost = useMutation(api.posts.create);
  const updatePost = useMutation(api.posts.updateByLegacyId);
  const removePost = useMutation(api.posts.removeByLegacyId);
  const uploadToConvex = useUploadImage();
  const [scheduledDate, setScheduledDate] = useState<Date>(new Date());
  const [platformOptions, setPlatformOptions] = useState<string[]>([]);
  const [statusOptions, setStatusOptions] = useState<Array<{name: string, color: string}>>([]);
  const [pillar, setPillar] = useState<string>('none');
  const [productLine, setProductLine] = useState<string>('none');
  const [pillarOptions, setPillarOptions] = useState<Array<{name: string, color: string}>>([]);
  const [productLineOptions, setProductLineOptions] = useState<Array<{name: string, color: string}>>([]);
  const [categoryOptions, setCategoryOptions] = useState<Array<{name: string, color: string, format: string}>>([]);
  const [authorOptions, setAuthorOptions] = useState<Array<{initials: string, name: string, color: string, email?: string}>>([]);
  const [author, setAuthor] = useState<string>('');
  const [recurringActionId, setRecurringActionId] = useState<string>('none');
  const [recurringActions, setRecurringActions] = useState<Array<{id: string, title: string, action_type: string}>>([]);
  const [activeTab, setActiveTab] = useState('content');
  const [commentRefresh, setCommentRefresh] = useState(0);
  const [replyTrigger, setReplyTrigger] = useState<{ authorName: string; content: string; nonce: number } | null>(null);
  const { toast } = useToast();

  // Taxonomy options are read reactively from Convex — a change in Settings
  // shows up here on the next tick with no manual "reload". Only active rows
  // are kept and names are sorted, matching the old .eq('is_active').order(name).
  const platformsQ = useQuery(api.taxonomy.listPlatforms);
  const statusesQ = useQuery(api.taxonomy.listStatuses);
  const pillarsQ = useQuery(api.taxonomy.listPillars);
  const productLinesQ = useQuery(api.taxonomy.listProductLines);
  const categoriesQ = useQuery(api.taxonomy.listCategories);
  const authorsQ = useQuery(api.authors.list, { activeOnly: true });

  useEffect(() => {
    const activeSorted = <T extends { name?: string; isActive?: boolean }>(rows: T[] | undefined) =>
      (rows ?? [])
        .filter((r) => r.isActive !== false)
        .sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''));
    const platforms = activeSorted(platformsQ).map((p: any) => p.name);
    const statuses = activeSorted(statusesQ).map((s: any) => ({ name: s.name, color: s.color }));
    setPlatformOptions(platforms);
    setStatusOptions(statuses);
    setPillarOptions(activeSorted(pillarsQ).map((p: any) => ({ name: p.name, color: p.color })));
    setProductLineOptions(
      activeSorted(productLinesQ).map((p: any) => ({ name: p.name, color: p.color })),
    );
    setCategoryOptions(
      activeSorted(categoriesQ).map((c: any) => ({
        name: c.name,
        color: c.color,
        format: c.format,
      })),
    );
    setAuthorOptions(
      (authorsQ ?? []).map((a: any) => ({
        initials: a.initials,
        name: a.name,
        color: a.color,
        email: a.email ?? undefined,
      })),
    );

    // Defaults for new posts (only run once we have data and only when the
    // sidebar is open editing a fresh post).
    if (isOpen && !post) {
      if (platforms.length && !platform) setPlatform(platforms[0]);
      if (statuses.length && !status) setStatus(statuses[0].name);
      if (!category) setCategory('Image');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [platformsQ, statusesQ, pillarsQ, productLinesQ, categoriesQ, authorsQ, isOpen, post]);

  // recurring_action_id on posts is a real Convex Id<"recurringActions">
  // (remapped during migration, unlike the name-string taxonomies), so each
  // option is keyed by its own _id — see adapter.ts.
  const recurringActionsQ = useQuery(api.recurringActions.list);
  useEffect(() => {
    if (!recurringActionsQ) return;
    setRecurringActions(
      [...recurringActionsQ]
        .sort((a: any, b: any) => (a.title ?? '').localeCompare(b.title ?? ''))
        .map((a: any) => ({
          id: a._id,
          title: a.title ?? '',
          action_type: a.actionType,
        })),
    );
  }, [recurringActionsQ]);

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
      setRecurringActionId((post as any).recurring_action_id || 'none');

      // Set existing images
      const images: (string | null)[] = [
        post.image_url_1 || post.image_url || null,
        post.image_url_2 || null,
        post.image_url_3 || null
      ];
      setPostImages(images);
      
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
      setRecurringActionId('none');
      setScheduledDate(selectedDate);
      setTime('12:00');
      setPostImages([null, null, null]);
    }
  }, [post, selectedDate]);


  // Uploads to Convex file storage and returns just the served URL, matching
  // the old signature so callers (MultiImageUpload, etc.) don't need to change.
  // The corresponding storage id is stashed in the caller by way of the
  // dedicated upload flow — see `handleImageChange` below.
  const uploadImage = async (file: File): Promise<string> => {
    const { url } = await uploadToConvex(file);
    return url;
  };

  // Preferred flow when we can plumb the storage id back into state, so the
  // saved post stores the stable id (and gets a fresh URL every load).
  const uploadImageWithId = async (
    file: File,
  ): Promise<{ url: string; storageId: Id<'_storage'> }> => uploadToConvex(file);

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
      const scheduledDateTime = new Date(scheduledDate);
      const [hours, minutes] = time.split(':').map(Number);
      scheduledDateTime.setHours(hours, minutes, 0, 0);

      // Build a snake_case UI payload and convert it to a Convex patch. The
      // adapter drops undefined keys so we only touch fields we actually set.
      const patch = socialPostToConvexPatch({
        title: title.trim(),
        content: content.trim() || null,
        platform,
        status,
        category,
        image_url_1: postImages[0] ?? null,
        image_url_2: postImages[1] ?? null,
        image_url_3: postImages[2] ?? null,
        scheduled_date: scheduledDateTime.toISOString(),
        pillar: pillar && pillar !== 'none' ? pillar : null,
        product_line: productLine && productLine !== 'none' ? productLine : null,
        author: author || null,
        recurring_action_id: recurringActionId && recurringActionId !== 'none' ? recurringActionId : null,
      });
      // Storage ids: three cases per slot —
      //   image cleared (postImages[i] === null): send null so the stored id
      //     is wiped too, otherwise the Convex query would resolve it back
      //     into imageUrl and the "deleted" photo would reappear.
      //   new upload in this session: send the fresh storage id.
      //   unchanged: skip the field so ctx.db.patch keeps the existing id.
      const applyImageSlot = (
        idx: number,
        idKey: 'imageStorageId' | 'imageStorageId2' | 'imageStorageId3',
      ) => {
        if (postImages[idx] === null) patch[idKey] = null;
        else if (postImageStorageIds[idx] !== null) patch[idKey] = postImageStorageIds[idx];
      };
      applyImageSlot(0, 'imageStorageId');
      applyImageSlot(1, 'imageStorageId2');
      applyImageSlot(2, 'imageStorageId3');
      if (post) {
        await updatePost({ legacyId: post.id, patch: patch as any });
      } else {
        await createPost(patch as any);
      }

      toast({
        title: 'Success',
        description: post ? 'Post updated successfully!' : 'Post created successfully!',
      });
      // Convex useQuery in the calendar views auto-refreshes; the legacy
      // postsChanged event is still dispatched for anything Supabase-backed.
      window.dispatchEvent(new Event('postsChanged'));
      onSave();
    } catch (error: any) {
      console.error('Error saving post:', error);
      toast({
        title: 'Chyba při ukládání',
        description: error?.message || 'Failed to save post',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!post || !confirm('Are you sure you want to delete this post?')) return;

    try {
      await removePost({ legacyId: post.id });

      toast({
        title: 'Success',
        description: 'Post deleted successfully!',
      });

      // Kept for parity with Supabase-era components still listening.
      window.dispatchEvent(new Event('postsChanged'));

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

  // (The old inline-text comment system + initials-based Supabase mention
  // emails were removed here in favor of the Convex-backed CommentEditor /
  // CommentList components rendered in the sidebar's right column.)

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
        "fixed top-0 right-0 h-screen w-2/3 min-w-[800px] max-w-[1200px] bg-background border-l border-border shadow-2xl z-50 transition-transform duration-300 ease-out",
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
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Two Column Layout */}
          <div className="flex-1 overflow-hidden flex">
            {/* Left Column - Content */}
            <div className="flex-1 bg-muted/20 border-r border-border flex flex-col">
              <div className="px-4 py-3 border-b border-border bg-muted/40">
                <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4" />
                  Post Content
                </h3>
              </div>
              
              <ScrollArea className="flex-1">
                <div className="p-6 space-y-6 pb-20">
                  {/* Multi Image Upload */}
                  <div className="space-y-2">
                    <Label>Images</Label>
                    <MultiImageUpload
                      images={postImages}
                      onImagesChange={setPostImages}
                      imageIds={postImageStorageIds}
                      onImageIdsChange={setPostImageStorageIds}
                      maxImages={3}
                    />
                  </div>

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

                  {/* Pillar Tags */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Pillar</Label>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant={pillar === 'none' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setPillar('none')}
                        className="h-8"
                      >
                        None
                      </Button>
                      {pillarOptions.filter(p => p.name && p.name.trim() !== '').map((p) => (
                        <Button
                          key={p.name}
                          type="button"
                          variant={pillar === p.name ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setPillar(p.name)}
                          className="h-8"
                          style={
                            pillar === p.name
                              ? {
                                  backgroundColor: p.color,
                                  borderColor: p.color,
                                  color: '#fff',
                                }
                              : {
                                  borderColor: p.color,
                                  color: p.color,
                                }
                          }
                        >
                          {p.name}
                        </Button>
                      ))}
                    </div>
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
                      <div className="flex flex-wrap gap-2">
                        {statusOptions.filter(s => s.name && s.name.trim() !== '').map((s) => (
                          <Button
                            key={s.name}
                            type="button"
                            variant={status === s.name ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => {
                              console.log('Status button clicked:', s.name);
                              console.log('Previous status:', status);
                              setStatus(s.name);
                              console.log('Status after setState:', s.name);
                            }}
                            className="h-8"
                            style={
                              status === s.name
                                ? {
                                    backgroundColor: s.color,
                                    borderColor: s.color,
                                    color: '#fff',
                                  }
                                : {
                                    borderColor: s.color,
                                    color: s.color,
                                  }
                            }
                          >
                            {s.name}
                          </Button>
                        ))}
                      </div>
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

                  {/* Recurring Action */}
                  <div className="space-y-2">
                    <Label className={`text-sm font-medium ${recurringActionId === 'none' ? 'text-amber-600' : ''}`}>
                      Pravidelná akce {recurringActionId === 'none' && <span className="text-amber-600">⚠</span>}
                    </Label>
                    <Select value={recurringActionId} onValueChange={setRecurringActionId}>
                      <SelectTrigger className={recurringActionId === 'none' ? 'border-amber-500/50 bg-amber-50/5' : ''}>
                        <SelectValue placeholder="Vyberte akci" />
                      </SelectTrigger>
                      <SelectContent className="bg-background border border-border shadow-lg z-[60]">
                        <SelectItem value="none">Žádná</SelectItem>
                        <SelectItem value="_" disabled className="text-xs font-semibold opacity-50">📅 Měsíční</SelectItem>
                        {recurringActions.filter(a => a.action_type === 'monthly').map((a) => (
                          <SelectItem key={a.id} value={a.id} className="pl-6">
                            {a.title}
                          </SelectItem>
                        ))}
                        <SelectItem value="__" disabled className="text-xs font-semibold opacity-50">📱 Týdenní</SelectItem>
                        {recurringActions.filter(a => a.action_type === 'weekly').map((a) => (
                          <SelectItem key={a.id} value={a.id} className="pl-6">
                            {a.title}
                          </SelectItem>
                        ))}
                        <SelectItem value="___" disabled className="text-xs font-semibold opacity-50">🎁 Čtvrtletní</SelectItem>
                        {recurringActions.filter(a => a.action_type === 'quarterly').map((a) => (
                          <SelectItem key={a.id} value={a.id} className="pl-6">
                            {a.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {recurringActionId === 'none' && (
                      <p className="text-xs text-amber-600">
                        Pro sledování v plánování vyberte akci, ke které tento příspěvek patří
                      </p>
                    )}
                  </div>

                  {/* Action Status Indicators */}
                  {recurringActionId && recurringActionId !== 'none' && (
                    <div className="space-y-2 p-3 bg-muted/30 rounded-lg">
                      <Label className="text-xs font-medium text-muted-foreground">Status akcí</Label>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <div className={`h-3 w-3 rounded-full ${recurringActions.find(a => a.id === recurringActionId)?.action_type === 'monthly' ? 'bg-green-500' : 'bg-gray-300'}`} />
                          <span className="text-xs">Měsíční</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className={`h-3 w-3 rounded-full ${recurringActions.find(a => a.id === recurringActionId)?.action_type === 'weekly' ? 'bg-green-500' : 'bg-gray-300'}`} />
                          <span className="text-xs">Týdenní</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className={`h-3 w-3 rounded-full ${recurringActions.find(a => a.id === recurringActionId)?.action_type === 'quarterly' ? 'bg-green-500' : 'bg-gray-300'}`} />
                          <span className="text-xs">Čtvrtletní</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Product Line */}
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
                </div>
              </ScrollArea>
            </div>

            {/* Right Column - Comments */}
            <div className="flex-1 bg-accent/10 flex flex-col">
              <div className="px-4 py-3 border-b border-border bg-accent/20">
                <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Comments & Discussion
                </h3>
              </div>
              
              <ScrollArea className="flex-1">
                <div className="p-6 space-y-6">
                  {post ? (
                    <>
                      <p className="text-xs text-muted-foreground">
                        Použijte <strong>@Jméno</strong> pro označení člena týmu.
                        Zmínění dostanou e-mail (pokud mají zapnuté notifikace).
                        Uživatele spravuj v Settings → Správa uživatelů.
                      </p>

                      <CommentList
                        postId={post.id}
                        refreshTrigger={commentRefresh}
                        onReply={({ authorName, content }) =>
                          setReplyTrigger({ authorName, content, nonce: Date.now() })
                        }
                      />

                      <CommentEditor
                        postId={post.id}
                        onCommentAdded={() => setCommentRefresh(prev => prev + 1)}
                        replyTrigger={replyTrigger}
                      />
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Uložte nejdřív příspěvek — komentáře se aktivují po vytvoření.
                    </p>
                  )}
                </div>
              </ScrollArea>
            </div>
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

    </>
  );
};