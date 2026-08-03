import { useMutation, useConvex } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';

// Convex file storage upload, replacing supabase.storage.upload/getPublicUrl.
// Returns { storageId, url } so callers can store the id on the owning
// document (posts.imageStorageId) AND immediately show the image.
//
// Usage:
//   const uploadImage = useUploadImage()
//   const { storageId, url } = await uploadImage(file)
export function useUploadImage() {
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);
  const convex = useConvex();

  return async (
    file: File,
  ): Promise<{ storageId: Id<'_storage'>; url: string }> => {
    const postUrl = await generateUploadUrl();
    const res = await fetch(postUrl, {
      method: 'POST',
      headers: file.type ? { 'Content-Type': file.type } : undefined,
      body: file,
    });
    if (!res.ok) {
      throw new Error(`Upload failed: ${res.status} ${await res.text()}`);
    }
    const { storageId } = (await res.json()) as { storageId: Id<'_storage'> };
    // Ask Convex for the served URL (handles auth + region correctly).
    const url = (await convex.query(api.files.getUrl, { storageId })) ?? '';
    return { storageId, url };
  };
}
