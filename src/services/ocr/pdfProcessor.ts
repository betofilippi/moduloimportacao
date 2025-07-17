/**
 * Minimal PDF processor utilities for file validation
 * Main document processing logic is in services/documents
 */

const ALLOWED_EXTENSIONS = ['.pdf'];
const ALLOWED_MIME_TYPES = ['application/pdf'];

/**
 * Get file type/extension from filename
 */
export function getFileType(filename: string): string {
  const parts = filename.split('.');
  return parts.length > 1 ? `.${parts[parts.length - 1].toLowerCase()}` : '';
}

/**
 * Check if file type is valid (PDF only)
 */
export function isValidFileType(filename: string): boolean {
  const fileType = getFileType(filename);
  return ALLOWED_EXTENSIONS.includes(fileType);
}

/**
 * Get MIME type from filename
 */
export function getMimeType(filename: string): string {
  const fileType = getFileType(filename);
  switch (fileType) {
    case '.pdf':
      return 'application/pdf';
    default:
      return 'application/octet-stream';
  }
}

/**
 * Validate PDF buffer
 */
export function isValidPDFBuffer(buffer: Buffer): boolean {
  // Check PDF magic number
  const pdfHeader = buffer.slice(0, 4).toString();
  return pdfHeader === '%PDF';
}

/**
 * Get file size in human readable format
 */
export function formatFileSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${size.toFixed(2)} ${units[unitIndex]}`;
}