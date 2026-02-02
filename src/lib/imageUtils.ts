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

  // Already a full URL with protocol
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }

  // URL without protocol (e.g., "domain.supabase.co/...")
  if (url.includes('supabase.co/')) {
    return `https://${url}`;
  }

  // Relative path or filename only - construct full Supabase Storage URL
  // Remove 'public/' prefix if present since getPublicUrl adds it
  const fileName = url.startsWith('public/') ? url.substring(7) : url;

  const { data } = supabase.storage
    .from('social-media-images')
    .getPublicUrl(fileName);

  return data.publicUrl;
}

/**
 * Converts an array of image URLs to proper public URLs
 */
export function getImageUrls(imageUrls: (string | null | undefined)[]): (string | null)[] {
  return imageUrls.map(url => getImageUrl(url));
}
