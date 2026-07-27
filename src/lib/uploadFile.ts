import { api, convex } from '@/lib/convex';
import type { Id } from '../../convex/_generated/dataModel';

export interface UploadedFile {
  storageId: Id<'_storage'>;
  url: string;
}

/**
 * Uploads a file to Convex file storage and returns its permanent public URL.
 * Replaces the former Supabase Storage upload + getPublicUrl pair.
 */
export async function uploadFileToConvex(file: File): Promise<UploadedFile> {
  const uploadUrl = await convex.mutation(api.files.generateUploadUrl, {});

  const response = await fetch(uploadUrl, {
    method: 'POST',
    headers: file.type ? { 'Content-Type': file.type } : undefined,
    body: file,
  });

  if (!response.ok) {
    throw new Error(`Upload selhal (HTTP ${response.status})`);
  }

  const { storageId } = (await response.json()) as { storageId: Id<'_storage'> };
  const url = await convex.query(api.files.getUrl, { storageId });

  if (!url) {
    throw new Error('Nahraný soubor nemá URL');
  }

  return { storageId, url };
}
