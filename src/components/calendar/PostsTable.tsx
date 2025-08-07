import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Facebook, Instagram, Twitter, Linkedin, Calendar, Clock, Trash2, Plus, Save, X, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Platform, PostStatus, SocialPost, Category } from '../SocialCalendar';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface PostsTableProps {
  selectedPlatforms: Platform[];
  selectedStatuses: PostStatus[];
  currentDate: Date;
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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newPost, setNewPost] = useState({
    title: '',
    content: '',
    platform: 'facebook' as Platform,
    status: 'draft' as PostStatus,
    category: 'Image' as Category,
    scheduled_date: format(new Date(), 'yyyy-MM-dd'),
    time: '12:00',
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

  useEffect(() => {
    fetchPosts();
  }, []);

  const filteredPosts = posts.filter(post => {
    const isPlatformSelected = selectedPlatforms.includes(post.platform);
    const isStatusSelected = selectedStatuses.includes(post.status);
    return isPlatformSelected && isStatusSelected;
  });

  const handleEdit = (post: SocialPost) => {
    setEditingId(post.id);
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
      setEditingId(null);
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

      const { error } = await supabase
        .from('social_media_posts')
        .insert([{
          title: newPost.title,
          content: newPost.content || null,
          platform: newPost.platform,
          status: newPost.status,
          category: newPost.category,
          scheduled_date: scheduledDateTime.toISOString(),
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
      });
      fetchPosts();
    } catch (error) {
      console.error('Error creating post:', error);
      toast.error('Failed to create post');
    }
  };

  const updatePost = (postId: string, field: string, value: any) => {
    setPosts(posts.map(post => 
      post.id === postId ? { ...post, [field]: value } : post
    ));
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-muted-foreground">Loading posts...</div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-4 overflow-auto">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Social Media Posts</h2>
        <Button onClick={() => setIsCreating(true)} disabled={isCreating}>
          <Plus className="h-4 w-4 mr-2" />
          New Post
        </Button>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
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
                </TableCell>
                <TableCell>
                  <Select value={newPost.status} onValueChange={(value: PostStatus) => setNewPost({...newPost, status: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="scheduled">Scheduled</SelectItem>
                      <SelectItem value="published">Published</SelectItem>
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
            
            {filteredPosts.map((post) => {
              const Icon = platformIcons[post.platform];
              const isEditing = editingId === post.id;
              const postDate = new Date(post.scheduled_date);
              
              return (
                <TableRow key={post.id}>
                  <TableCell>
                    {isEditing ? (
                      <Input
                        value={post.title}
                        onChange={(e) => updatePost(post.id, 'title', e.target.value)}
                      />
                    ) : (
                      <div className="font-medium">{post.title}</div>
                    )}
                  </TableCell>
                  <TableCell>
                    {isEditing ? (
                      <Textarea
                        value={post.content || ''}
                        onChange={(e) => updatePost(post.id, 'content', e.target.value)}
                        rows={2}
                      />
                    ) : (
                      <div className="text-sm text-muted-foreground truncate max-w-[250px]">
                        {post.content || 'No content'}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {isEditing ? (
                      <Select value={post.platform} onValueChange={(value: Platform) => updatePost(post.id, 'platform', value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {(['facebook', 'instagram', 'twitter', 'linkedin'] as Platform[]).map((p) => {
                            const PlatformIcon = platformIcons[p];
                            return (
                              <SelectItem key={p} value={p}>
                                <div className="flex items-center gap-2">
                                  <PlatformIcon className="h-4 w-4" />
                                  {p.charAt(0).toUpperCase() + p.slice(1)}
                                </div>
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        <span className="capitalize">{post.platform}</span>
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {isEditing ? (
                      <Select value={post.status} onValueChange={(value: PostStatus) => updatePost(post.id, 'status', value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="draft">Draft</SelectItem>
                          <SelectItem value="scheduled">Scheduled</SelectItem>
                          <SelectItem value="published">Published</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <span className="capitalize">{post.status}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {isEditing ? (
                      <div className="space-y-2">
                        <Input
                          type="date"
                          value={format(postDate, 'yyyy-MM-dd')}
                          onChange={(e) => {
                            const newDate = new Date(e.target.value);
                            newDate.setHours(postDate.getHours(), postDate.getMinutes());
                            updatePost(post.id, 'scheduled_date', newDate.toISOString());
                          }}
                        />
                        <Input
                          type="time"
                          value={format(postDate, 'HH:mm')}
                          onChange={(e) => {
                            const [hours, minutes] = e.target.value.split(':').map(Number);
                            const newDate = new Date(postDate);
                            newDate.setHours(hours, minutes);
                            updatePost(post.id, 'scheduled_date', newDate.toISOString());
                          }}
                        />
                      </div>
                    ) : (
                      <div className="text-sm">
                        <div>{format(postDate, 'MMM d, yyyy')}</div>
                        <div className="text-muted-foreground">{format(postDate, 'HH:mm')}</div>
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {isEditing ? (
                        <>
                          <Button size="sm" onClick={() => handleSave(post)}>
                            <Save className="h-3 w-3" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>
                            <X className="h-3 w-3" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button size="sm" variant="outline" onClick={() => handleEdit(post)}>
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleDelete(post.id)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};