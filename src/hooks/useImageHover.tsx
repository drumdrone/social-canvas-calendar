import { useState, useEffect } from 'react';

export const useImageHover = (images: (string | null)[], intervalMs: number = 2000) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isHovering, setIsHovering] = useState(false);

  const validImages = images.filter(Boolean) as string[];

  useEffect(() => {
    if (!isHovering || validImages.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % validImages.length);
    }, intervalMs);

    return () => clearInterval(interval);
  }, [isHovering, validImages.length, intervalMs]);

  useEffect(() => {
    if (!isHovering) {
      setCurrentImageIndex(0);
    }
  }, [isHovering]);

  const currentImage = validImages[currentImageIndex] || validImages[0];

  return {
    currentImage,
    setIsHovering,
    hasMultipleImages: validImages.length > 1,
    imageCount: validImages.length
  };
};