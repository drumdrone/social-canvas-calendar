import { supabase } from '@/integrations/supabase/client';

/**
 * Converts a stored image path/URL to a proper public URL
 * Handles different URL formats stored in the database:
 * - Full URLs with protocol (https://...)
 * - URLs without protocol (supabase.co/...)
 * - Relative paths (public/filename.jpg)
 * - Just filenames (filename.jpg)
 */
export function getImageUrl(imageUrl: string | null | undefined): string | null {
  // Return null if no URL provided
  if (!imageUrl || imageUrl.trim() === '') {
    return null;
  }

  const url = imageUrl.trim();

  console.log('getImageUrl input:', url);

  // Already a full URL with protocol
  if (url.startsWith('http://') || url.startsWith('https://')) {
    console.log('getImageUrl output (already full):', url);
    return url;
  }

  // URL without protocol (e.g., "domain.supabase.co/...")
  if (url.includes('supabase.co/')) {
    const result = `https://${url}`;
    console.log('getImageUrl output (added https):', result);
    return result;
  }

  // Check if it's a path to local public folder
  if (url.startsWith('public/') || url.startsWith('/public/')) {
    const cleanPath = url.replace(/^\/?(public\/)/, '');
    // For GitHub Pages, we need to include the base path
    const basePath = import.meta.env.BASE_URL || '/';
    const result = `${basePath}${cleanPath}`;
    console.log('getImageUrl output (local public):', result);
    return result;
  }

  // Relative path or filename only - construct full Supabase Storage URL
  // Keep the path as-is, getPublicUrl will handle it
  const { data } = supabase.storage
    .from('social-media-images')
    .getPublicUrl(url);

  console.log('getImageUrl output (from storage):', data.publicUrl);
  return data.publicUrl;
}

/**
 * Converts an array of image URLs to proper public URLs
 */
export function getImageUrls(imageUrls: (string | null | undefined)[]): (string | null)[] {
  return imageUrls.map(url => getImageUrl(url));
}
