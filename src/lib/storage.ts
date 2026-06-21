export const ALLOWED_MIME_TYPES: readonly string[] = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/jpeg',
  'image/png',
];

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MB

export function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_');
}

export function validateUploadFile(file: File): string | null {
  if (file.size > MAX_UPLOAD_BYTES) return 'File exceeds the 10 MB limit.';
  if (file.type && !ALLOWED_MIME_TYPES.includes(file.type)) {
    return 'File type not allowed. Use PDF, Word, Excel, JPG, or PNG.';
  }
  return null;
}
