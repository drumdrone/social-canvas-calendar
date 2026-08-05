import React, { useState, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { X, Upload, Image, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useUploadImage } from "@/integrations/convex/useUploadImage";
import type { Id } from "../../../convex/_generated/dataModel";

interface MultiImageUploadProps {
  images: (string | null)[];
  onImagesChange: (images: (string | null)[]) => void;
  // Optional: parent can also track the Convex storage id per slot, so the
  // saved post persists the id (stable) rather than only the served URL.
  onImageIdsChange?: (ids: (Id<'_storage'> | null)[]) => void;
  imageIds?: (Id<'_storage'> | null)[];
  maxImages?: number;
}

export const MultiImageUpload: React.FC<MultiImageUploadProps> = ({
  images,
  onImagesChange,
  onImageIdsChange,
  imageIds,
  maxImages = 3
}) => {
  const [uploading, setUploading] = useState<number | null>(null);
  const fileInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const uploadToConvex = useUploadImage();

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>, slotIndex: number) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Reset input value to allow uploading same file again
    event.target.value = '';

    setUploading(slotIndex);
    try {
      const { url, storageId } = await uploadToConvex(file);

      const newImages = [...images];
      newImages[slotIndex] = url;
      onImagesChange(newImages);

      if (onImageIdsChange) {
        const currentIds = imageIds ?? [null, null, null];
        const newIds = [...currentIds];
        newIds[slotIndex] = storageId;
        onImageIdsChange(newIds);
      }

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

    const newImages = [...images];
    newImages[slotIndex] = null;
    onImagesChange(newImages);

    if (onImageIdsChange) {
      const currentIds = imageIds ?? [null, null, null];
      const newIds = [...currentIds];
      newIds[slotIndex] = null;
      onImageIdsChange(newIds);
    }

    toast.success('Image removed');
  };

  const handleUploadClick = (index: number) => {
    fileInputRefs.current[index]?.click();
  };

  // Slot 0 (the primary image) gets its own full-width row and a taller
  // preview; the rest share a row below.
  const renderSlot = (index: number, heightClass: string) => (
    <div key={index} className="space-y-1">
      <Label className="text-xs text-muted-foreground">Image {index + 1}</Label>

      {images[index] ? (
        <div className={`relative group ${heightClass} bg-muted/30 rounded-lg border overflow-hidden`}>
          <img
            src={images[index] || ''}
            alt={`Upload ${index + 1}`}
            className="w-full h-full object-contain"
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
          className={`${heightClass} border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center gap-1 cursor-pointer hover:border-primary/50 hover:bg-muted/50 transition-colors`}
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
  );

  return (
    <div className="space-y-3">
      {renderSlot(0, 'h-48')}
      {maxImages > 1 && (
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: maxImages - 1 }).map((_, i) => renderSlot(i + 1, 'h-28'))}
        </div>
      )}
    </div>
  );
};
