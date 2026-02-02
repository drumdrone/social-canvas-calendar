import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X, Upload, Image } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getImageUrl } from "@/lib/imageUtils";

interface MultiImageUploadProps {
  images: (string | null)[];
  onImagesChange: (images: (string | null)[]) => void;
  maxImages?: number;
}

export const MultiImageUpload: React.FC<MultiImageUploadProps> = ({
  images,
  onImagesChange,
  maxImages = 3
}) => {
  const [uploading, setUploading] = useState(false);

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>, slotIndex: number) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('social-media-images')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('social-media-images')
        .getPublicUrl(fileName);

      const newImages = [...images];
      newImages[slotIndex] = data.publicUrl;
      onImagesChange(newImages);
      
      toast.success('Image uploaded successfully');
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = (slotIndex: number) => {
    const newImages = [...images];
    newImages[slotIndex] = null;
    onImagesChange(newImages);
  };


  return (
    <div className="space-y-4">
      <Label className="text-sm font-medium">Post Images (up to {maxImages})</Label>
      
      <div className="grid grid-cols-3 gap-4">
        {Array.from({ length: maxImages }).map((_, index) => (
          <div key={index} className="space-y-2">
            <Label className="text-xs text-muted-foreground">Image {index + 1}</Label>
            
            {images[index] ? (
              <div className="relative group">
                <img
                  src={getImageUrl(images[index]) || ''}
                  alt={`Upload ${index + 1}`}
                  className="w-full h-32 object-cover rounded-lg border"
                />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleRemoveImage(index)}
                    className="absolute top-2 right-2"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="h-32 border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center gap-2">
                <Image className="w-8 h-8 text-muted-foreground" />
                <div className="flex gap-1">
                  <Label className="cursor-pointer">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs h-7"
                      disabled={uploading}
                      asChild
                    >
                      <span>
                        <Upload className="w-3 h-3 mr-1" />
                        Upload
                      </span>
                    </Button>
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageUpload(e, index)}
                      className="hidden"
                    />
                  </Label>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

    </div>
  );
};