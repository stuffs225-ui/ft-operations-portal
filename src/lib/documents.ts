import { supabase } from './supabase';

export function formatFileSize(bytes: number | null): string {
  if (bytes == null) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export async function openSignedUrl(
  bucket: string,
  storagePath: string,
  expiresIn = 60,
): Promise<void> {
  if (!supabase) return;
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(storagePath, expiresIn);
  if (error || !data?.signedUrl) {
    console.error('[openSignedUrl] failed', { bucket, storagePath, error });
    return;
  }
  window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
}
