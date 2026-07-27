import React, { useState, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { X, Upload, Image, Loader2 } from "lucide-react";
import { uploadFileToConvex } from "@/lib/uploadFile";
import { toast } from "sonner";

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
  const [uploading, setUploading] = useState<number | null>(null);
  const fileInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>, slotIndex: number) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Reset input value to allow uploading same file again
    event.target.value = '';

    setUploading(slotIndex);
    try {
      console.log('Uploading image, file size:', file.size);

      const { url } = await uploadFileToConvex(file);

      console.log('Image uploaded, URL:', url);

      const newImages = [...images];
      newImages[slotIndex] = url;
      onImagesChange(newImages);

      toast.success('Image uploaded successfully');
    } catch (error: any) {
      console.error('Error uploading image:', error);
      toast.error(`Failed to upload image: ${error.message || 'Unknown error'}`);
    } finally {
      setUploading(null);
    }
  };

  const handleRemoveImage = (e: React.MouseEvent, slotIndex: number) => {
    e.preventDefault();
    e.stopPropagation();

    console.log('Removing image at slot:', slotIndex);
    const newImages = [...images];
    newImages[slotIndex] = null;
    onImagesChange(newImages);
    toast.success('Image removed');
  };

  const handleUploadClick = (index: number) => {
    fileInputRefs.current[index]?.click();
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-3">
        {Array.from({ length: maxImages }).map((_, index) => (
          <div key={index} className="space-y-1">
            <Label className="text-xs text-muted-foreground">Image {index + 1}</Label>

            {images[index] ? (
              <div className="relative group">
                <img
                  src={images[index] || ''}
                  alt={`Upload ${index + 1}`}
                  className="w-full h-28 object-cover rounded-lg border"
                />
                <Button
                  size="icon"
                  variant="destructive"
                  onClick={(e) => handleRemoveImage(e, index)}
                  className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            ) : (
              <div
                className="h-28 border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center gap-1 cursor-pointer hover:border-primary/50 hover:bg-muted/50 transition-colors"
                onClick={() => handleUploadClick(index)}
              >
                {uploading === index ? (
                  <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
                ) : (
                  <>
                    <Image className="w-6 h-6 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      <Upload className="w-3 h-3 inline mr-1" />
                      Upload
                    </span>
                  </>
                )}
                <input
                  ref={el => fileInputRefs.current[index] = el}
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleImageUpload(e, index)}
                  className="hidden"
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
