import React, { useState, useEffect } from 'react';
import { X, Save, Upload, Calendar as CalendarIcon, Clock, Trash2, History, Plus, MessageSquare, Edit3, Check, FileText } from 'lucide-react';
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
import { useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { socialPostToConvexPatch } from '@/integrations/convex/adapter';
import { useUploadImage } from '@/integrations/convex/useUploadImage';
import type { Id } from '../../../convex/_generated/dataModel';
// (Post writes moved to Convex; ensureSupabaseSession / forceReauthenticate
// are no longer needed here. They remain in SimpleAuthGate for the remaining
// Supabase-backed components — BackupManager — until they migrate.)
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { PostVersionHistory } from './PostVersionHistory';
import { MultiImageUpload } from './MultiImageUpload';
import { MentionInput } from './MentionInput';
import { CommentEditor } from '../comments/CommentEditor';
import { CommentList } from '../comments/CommentList';
import { SendPostPdfDialog } from './SendPostPdfDialog';

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
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [showPdfDialog, setShowPdfDialog] = useState(false);
  const [comments, setComments] = useState('');
  const [newComment, setNewComment] = useState('');
  const [selectedCommentAuthor, setSelectedCommentAuthor] = useState('');
  const [editingCommentIndex, setEditingCommentIndex] = useState<number | null>(null);
  const [editingCommentText, setEditingCommentText] = useState('');
  const [activeTab, setActiveTab] = useState('content');
  const [commentRefresh, setCommentRefresh] = useState(0);
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

  // recurring_actions is still Supabase-backed for now (the recurringActionId
  // field in posts is stored as a legacy UUID during the migration window).
  useEffect(() => {
    if (!isOpen) return;
    console.log('PostSlidingSidebar opened, loading recurring actions...');
    supabase
      .from('recurring_actions')
      .select('id, title, action_type')
      .order('title')
      .then(({ data }) => setRecurringActions(data ?? []));
  }, [isOpen]);

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
      setComments((post as any).comments || '');
      
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
      setComments('');
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
        comments: comments || null,
      });
      // Attach storage ids for any images uploaded via Convex in this session
      // (adapter only maps URL strings; ids need to go on directly).
      if (postImageStorageIds[0] !== null) patch.imageStorageId = postImageStorageIds[0];
      if (postImageStorageIds[1] !== null) patch.imageStorageId2 = postImageStorageIds[1];
      if (postImageStorageIds[2] !== null) patch.imageStorageId3 = postImageStorageIds[2];
      // recurring_action_id still uses the Supabase UUID during migration —
      // once recurring actions get their own legacyId lookup we'll thread it
      // through. Skip it for now rather than sending an incompatible value.
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

  // Comment management functions
  const handleEditComment = (index: number) => {
    const commentArray = comments.split('\n\n').filter(comment => comment.trim());
    const comment = commentArray[index];
    const match = comment.match(/^\[(.*?)\]\s+(.*?)\s+\(([^)]+)\):\s*(.*)$/);
    if (match) {
      setEditingCommentText(match[4]); // Extract comment text
    } else {
      setEditingCommentText(comment); // Fallback for old format
    }
    setEditingCommentIndex(index);
  };


  const handleSaveEditComment = async () => {
    if (editingCommentIndex !== null && editingCommentText.trim()) {
      const commentArray = comments.split('\n\n').filter(comment => comment.trim());
      const comment = commentArray[editingCommentIndex];
      const match = comment.match(/^\[(.*?)\]\s+(.*?)\s+\(([^)]+)\):\s*(.*)$/);

      let authorName = '';
      if (match) {
        const [, timestamp, originalAuthorName, authorInitials] = match;
        authorName = originalAuthorName;
        const updatedComment = `[${timestamp}] ${originalAuthorName} (${authorInitials}): ${editingCommentText.trim()}`;
        commentArray[editingCommentIndex] = updatedComment;
      } else {
        // Fallback for old format
        commentArray[editingCommentIndex] = editingCommentText.trim();
        authorName = 'Unknown User';
      }

      const updatedComments = commentArray.join('\n\n');
      setComments(updatedComments);

      // Save updated comments to database if post exists
      if (post?.id) {
        try {
          const { error } = await supabase
            .from('social_media_posts')
            .update({ comments: updatedComments })
            .eq('id', post.id);

          if (error) throw error;
        } catch (error) {
          console.error('Error saving updated comment to database:', error);
          toast({
            title: 'Warning',
            description: 'Comment updated but not saved to database.',
            variant: 'destructive',
          });
          return;
        }
      }

      // Detect mentions and send emails for updated comment
      await detectMentionsAndSendEmails(editingCommentText.trim(), authorName);

      setEditingCommentIndex(null);
      setEditingCommentText('');

      toast({
        title: 'Comment Updated',
        description: post?.id ? 'Comment has been saved and mentions notified.' : 'Comment updated. Save the post to persist it.',
      });
    }
  };

  const handleDeleteComment = async (index: number) => {
    if (confirm('Are you sure you want to delete this comment?')) {
      const commentArray = comments.split('\n\n').filter(comment => comment.trim());
      commentArray.splice(index, 1);
      const updatedComments = commentArray.join('\n\n');
      setComments(updatedComments);

      // Save updated comments to database if post exists
      if (post?.id) {
        try {
          const { error } = await supabase
            .from('social_media_posts')
            .update({ comments: updatedComments })
            .eq('id', post.id);

          if (error) throw error;
        } catch (error) {
          console.error('Error deleting comment from database:', error);
          toast({
            title: 'Warning',
            description: 'Comment deleted but not saved to database.',
            variant: 'destructive',
          });
          return;
        }
      }

      toast({
        title: 'Comment Deleted',
        description: post?.id ? 'Comment has been deleted and saved.' : 'Comment deleted. Save the post to persist changes.',
      });
    }
  };

  const handleCancelEdit = () => {
    setEditingCommentIndex(null);
    setEditingCommentText('');
  };

  // Function to detect mentions and send emails
  const detectMentionsAndSendEmails = async (commentText: string, commenterName: string) => {
    console.log('=== MENTION DETECTION STARTED ===');
    console.log('Comment text:', commentText);
    console.log('Available authors:', authorOptions);

    // Use the same regex as MentionInput component for consistency
    const mentionRegex = /@([A-Z]{2,})/g;
    const mentions = [...commentText.matchAll(mentionRegex)];
    
    console.log('Mentions found with regex:', mentions);
    
    if (mentions.length === 0) {
      console.log('No mentions detected in comment');
      toast({
        title: "No mentions found",
        description: "No valid mentions (@INITIALS format) detected in comment",
      });
      return;
    }
    
    for (const mention of mentions) {
      const mentionedInitials = mention[1].toUpperCase();
      console.log('Processing mention for initials:', mentionedInitials);
      
      const mentionedAuthor = authorOptions.find(a => 
        a.initials.toUpperCase() === mentionedInitials
      );
      
      console.log('Found author for initials:', mentionedAuthor);
      
      if (mentionedAuthor && mentionedAuthor.email) {
        try {
          console.log('=== CALLING EDGE FUNCTION ===');
          console.log('Sending email to:', mentionedAuthor.email);
          console.log('Function parameters:', {
            mentionedAuthorEmail: mentionedAuthor.email,
            mentionedAuthorName: mentionedAuthor.name,
            postTitle: title,
            commentText,
            commenterName,
          });
          
          const { data, error } = await supabase.functions.invoke('send-mention-email', {
            body: {
              mentionedAuthorEmail: mentionedAuthor.email,
              mentionedAuthorName: mentionedAuthor.name,
              postTitle: title,
              commentText,
              commenterName,
            },
          });

          console.log('=== EDGE FUNCTION RESPONSE ===');
          console.log('Data:', data);
          console.log('Error:', error);
          console.log('=== END EDGE FUNCTION RESPONSE ===');

          if (error) {
            console.error('Edge function returned error:', error);

            // Check if it's a Resend domain verification issue
            const isDomainIssue = error.message?.includes("verify a domain") ||
                                  error.message?.includes("testing emails") ||
                                  error.message?.includes("test mode");

            toast({
              title: isDomainIssue ? "Email service not configured" : "Email notification failed",
              description: isDomainIssue
                ? "Resend is in test mode. Verify your domain at resend.com/domains to send emails to team members."
                : `Could not send notification to ${mentionedAuthor.name}: ${error.message}`,
              variant: "destructive",
              duration: isDomainIssue ? 10000 : 5000,
            });
          } else if (data?.success) {
            console.log(`SUCCESS: Mention email sent to ${mentionedAuthor.email}`);
            toast({
              title: "Email sent successfully",
              description: `${mentionedAuthor.name} has been notified at ${mentionedAuthor.email}`,
            });
          } else if (data?.error) {
            // Handle error in response data
            const isDomainIssue = data.error.includes("verify a domain") ||
                                  data.error.includes("testing emails") ||
                                  data.error.includes("test mode");

            toast({
              title: isDomainIssue ? "Email service not configured" : "Email notification failed",
              description: isDomainIssue
                ? "Resend is in test mode. Verify your domain at resend.com/domains to send emails to team members."
                : data.error,
              variant: "destructive",
              duration: isDomainIssue ? 10000 : 5000,
            });
          }
        } catch (error) {
          console.error('Exception calling edge function:', error);
          toast({
            title: "Email notification failed",
            description: `Unable to send mention notification: ${error instanceof Error ? error.message : 'Unknown error'}`,
            variant: "destructive",
          });
        }
      } else if (mentionedAuthor && !mentionedAuthor.email) {
        toast({
          title: "No email address",
          description: `${mentionedAuthor.name} doesn't have an email address set`,
          variant: "destructive",
        });
      }
    }
  };

  const handleAddComment = async () => {
    if (newComment.trim() && selectedCommentAuthor) {
      const selectedAuthor = authorOptions.find(a => a.initials === selectedCommentAuthor);
      const timestamp = new Date().toLocaleString();
      const commentEntry = `[${timestamp}] ${selectedAuthor?.name} (${selectedCommentAuthor}): ${newComment.trim()}`;

      const updatedComments = comments ? `${comments}\n\n${commentEntry}` : commentEntry;
      setComments(updatedComments);

      // Save comment to database if post exists
      if (post?.id) {
        try {
          const { error } = await supabase
            .from('social_media_posts')
            .update({ comments: updatedComments })
            .eq('id', post.id);

          if (error) throw error;
        } catch (error) {
          console.error('Error saving comment to database:', error);
          toast({
            title: 'Warning',
            description: 'Comment added but not saved to database. Please save the post manually.',
            variant: 'destructive',
          });
          return;
        }
      }

      // Detect mentions and send emails
      await detectMentionsAndSendEmails(newComment.trim(), selectedAuthor?.name || selectedCommentAuthor);

      setNewComment('');
      setSelectedCommentAuthor('');

      toast({
        title: 'Comment Added',
        description: post?.id ? 'Comment has been saved.' : 'Comment added. Save the post to persist it.',
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
              {post && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowPdfDialog(true)}
                    title="Odeslat post jako PDF"
                    className="text-primary hover:text-primary hover:bg-primary/10 gap-1"
                  >
                    <FileText className="h-4 w-4" />
                    <span className="text-xs">PDF</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowVersionHistory(true)}
                    title="View version history"
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <History className="h-4 w-4" />
                  </Button>
                </>
              )}
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
                  {/* Existing Comments Display */}
                  {comments && (
                    <div className="space-y-4">
                      <Label className="text-sm font-medium">Comments</Label>
                      <div className="space-y-3">
                        {comments.split('\n\n').filter(comment => comment.trim()).map((comment, index) => {
                          // Parse comment format: [timestamp] Author Name (INITIALS): comment text
                          const match = comment.match(/^\[(.*?)\]\s+(.*?)\s+\(([^)]+)\):\s*(.*)$/);
                          if (match) {
                            const [, timestamp, authorName, authorInitials, commentText] = match;
                            const author = authorOptions.find(a => a.initials === authorInitials);
                            
                            return (
                              <div key={index} className="border rounded-lg p-4 bg-muted/30">
                                <div className="flex items-start gap-3">
                                  <div 
                                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 mt-0.5"
                                    style={{ backgroundColor: author?.color || '#3B82F6' }}
                                  >
                                    {authorInitials}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between mb-2">
                                      <div className="flex items-center gap-2">
                                        <span className="font-medium text-sm">{authorName}</span>
                                        <span className="text-xs text-muted-foreground">{timestamp}</span>
                                      </div>
                                      <div className="flex items-center gap-1">
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                                          onClick={() => handleEditComment(index)}
                                          title="Edit comment"
                                        >
                                          <Edit3 className="h-3 w-3" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                                          onClick={() => handleDeleteComment(index)}
                                          title="Delete comment"
                                        >
                                          <Trash2 className="h-3 w-3" />
                                        </Button>
                                      </div>
                                    </div>
                                    {editingCommentIndex === index ? (
                                      <div className="space-y-2">
                                        <Textarea
                                          value={editingCommentText}
                                          onChange={(e) => setEditingCommentText(e.target.value)}
                                          className="text-sm resize-none"
                                          rows={2}
                                        />
                                        <div className="flex items-center gap-2">
                                          <Button
                                            size="sm"
                                            className="h-6 px-2"
                                            onClick={handleSaveEditComment}
                                          >
                                            <Check className="h-3 w-3 mr-1" />
                                            Save
                                          </Button>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-6 px-2"
                                            onClick={handleCancelEdit}
                                          >
                                            <X className="h-3 w-3 mr-1" />
                                            Cancel
                                          </Button>
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="text-sm text-foreground whitespace-pre-wrap">{commentText}</div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          }
                          
                          // Fallback for old format comments or malformed comments
                          return (
                            <div key={index} className="border rounded-lg p-4 bg-muted/30">
                              <div className="text-sm whitespace-pre-wrap">{comment}</div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* New Comment Section */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium">Add New Comment</Label>
                      <div className="flex items-center gap-2">
                        <Label className="text-xs text-muted-foreground">Author:</Label>
                        <Select value={selectedCommentAuthor} onValueChange={setSelectedCommentAuthor}>
                          <SelectTrigger className="w-32 h-8">
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                          <SelectContent className="bg-background border border-border shadow-lg z-[60]">
                            {authorOptions.map((author) => (
                              <SelectItem key={author.initials} value={author.initials}>
                                <div className="flex items-center gap-2">
                                  <div 
                                    className="w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                                    style={{ backgroundColor: author.color }}
                                  >
                                    {author.initials}
                                  </div>
                                  {author.name}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    <MentionInput
                      value={newComment}
                      onChange={setNewComment}
                      authors={authorOptions}
                      rows={4}
                      className="text-base resize-none"
                    />
                    
                    <Button
                      onClick={handleAddComment}
                      disabled={!newComment.trim() || !selectedCommentAuthor}
                      size="sm"
                      className="self-start"
                    >
                      Add Comment
                    </Button>
                    
                    <p className="text-xs text-muted-foreground">
                      Comments are for internal team communication. Use @initials or @name to mention team members and send them email notifications.
                    </p>
                  </div>

                  {/* New @Mention Comment System */}
                  {post && (
                    <div className="space-y-4 pt-6 border-t">
                      <div>
                        <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                          <MessageSquare className="h-4 w-4" />
                          Team Mentions & Notifications
                        </h4>
                        <p className="text-xs text-muted-foreground mb-4">
                          Použijte @ pro označení členů týmu. Email notifikace budou odeslány automaticky.
                        </p>
                      </div>

                      <CommentList
                        postId={post.id}
                        refreshTrigger={commentRefresh}
                      />

                      <CommentEditor
                        postId={post.id}
                        onCommentAdded={() => setCommentRefresh(prev => prev + 1)}
                      />
                    </div>
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

      {/* Send Post as PDF Dialog */}
      {post && (
        <SendPostPdfDialog
          isOpen={showPdfDialog}
          onClose={() => setShowPdfDialog(false)}
          post={{
            title,
            content,
            platform,
            author: authorOptions.find(a => a.initials === author)?.name || author || '',
            scheduledDate: scheduledDate.toISOString(),
            images: postImages,
            category,
            pillar,
            status,
          }}
        />
      )}
    </>
  );
};