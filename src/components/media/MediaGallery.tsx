import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, Image, Trash2, FolderOpen } from "lucide-react";
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import { useUploadImage } from '@/integrations/convex/useUploadImage';
import { toast } from "sonner";

interface MediaGalleryProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (imageUrl: string) => void;
  currentImages?: string[];
}

interface MediaFile {
  id: Id<'mediaGalleryItems'>;
  name: string;
  url: string;
  created_at: string;
}

export const MediaGallery: React.FC<MediaGalleryProps> = ({
  isOpen,
  onClose,
  onSelect,
  currentImages = []
}) => {
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);

  const itemsQ = useQuery(api.mediaGallery.list, isOpen ? {} : "skip");
  const mediaFiles: MediaFile[] = (itemsQ ?? [])
    .filter((item: any) => item.url)
    .map((item: any) => ({
      id: item._id,
      name: item.name,
      url: item.url,
      created_at: item.createdAt ? new Date(item.createdAt).toISOString() : '',
    }));

  const uploadToConvex = useUploadImage();
  const addMediaItem = useMutation(api.mediaGallery.add);
  const removeMediaItem = useMutation(api.mediaGallery.remove);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      await Promise.all(
        Array.from(files).map(async (file) => {
          const { storageId } = await uploadToConvex(file);
          await addMediaItem({ storageId, name: file.name });
        }),
      );
      toast.success(`Successfully uploaded ${files.length} file(s)`);
    } catch (error) {
      console.error('Error uploading files:', error);
      toast.error('Failed to upload files');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteFile = async (id: Id<'mediaGalleryItems'>) => {
    try {
      await removeMediaItem({ id });
      toast.success('File deleted successfully');
    } catch (error) {
      console.error('Error deleting file:', error);
      toast.error('Failed to delete file');
    }
  };

  const handleSelectImage = (url: string) => {
    onSelect(url);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderOpen className="w-5 h-5" />
            Media Gallery
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="gallery" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="gallery" className="flex items-center gap-2">
              <Image className="w-4 h-4" />
              Gallery
            </TabsTrigger>
            <TabsTrigger value="upload" className="flex items-center gap-2">
              <Upload className="w-4 h-4" />
              Upload
            </TabsTrigger>
          </TabsList>

          <TabsContent value="gallery" className="mt-4">
            <div className="grid grid-cols-4 gap-4 max-h-96 overflow-y-auto">
              {mediaFiles.map((file) => (
                <div key={file.id} className="relative group">
                  <div 
                    className={`relative cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${
                      selectedFile === file.url 
                        ? 'border-primary ring-2 ring-primary/20' 
                        : 'border-border hover:border-primary/50'
                    }`}
                    onClick={() => setSelectedFile(file.url)}
                  >
                    <img
                      src={file.url}
                      alt={file.name}
                      className="w-full h-24 object-cover"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                  </div>
                  
                  <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      size="sm"
                      variant="destructive"
                      className="h-6 w-6 p-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteFile(file.id);
                      }}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                  
                  <p className="text-xs text-muted-foreground mt-1 truncate">
                    {file.name}
                  </p>
                </div>
              ))}
            </div>
            
            {selectedFile && (
              <div className="mt-4 flex gap-2">
                <Button onClick={() => handleSelectImage(selectedFile)}>
                  Select Image
                </Button>
                <Button variant="outline" onClick={() => setSelectedFile(null)}>
                  Clear Selection
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="upload" className="mt-4">
            <div className="space-y-4">
              <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                <Upload className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-lg font-medium mb-2">Upload Media Files</p>
                <p className="text-muted-foreground mb-4">
                  Select multiple images to upload to your media gallery
                </p>
                <Input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleFileUpload}
                  disabled={uploading}
                  className="max-w-xs mx-auto"
                />
              </div>
              
              {uploading && (
                <div className="text-center">
                  <p className="text-muted-foreground">Uploading files...</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};