import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/database';
import crypto from 'crypto';

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

export class StorageService {
  private static bucketName = 'ocr-documents';

  /**
   * Generate SHA256 hash from file buffer
   */
  static generateFileHash(buffer: Buffer): string {
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }

  /**
   * Ensure the OCR documents bucket exists
   */
  static async ensureBucketExists(): Promise<void> {
    const { data: buckets } = await supabase.storage.listBuckets();
    
    const bucketExists = buckets?.some(bucket => bucket.name === this.bucketName);
    
    if (!bucketExists) {
      const { error } = await supabase.storage.createBucket(this.bucketName, {
        public: false,
        fileSizeLimit: 20971520, // 20MB
        allowedMimeTypes: [
          'application/pdf',
          'image/jpeg',
          'image/jpg',
          'image/png',
          'image/tiff',
          'image/bmp'
        ]
      });
      
      if (error && error.message !== 'Bucket already exists') {
        throw error;
      }
    }
  }

  /**
   * Upload a file to Supabase Storage
   */
  static async uploadFile(
    file: Buffer,
    fileName: string,
    mimeType: string,
    userId: string
  ): Promise<{ path: string; publicUrl: string; fileHash: string }> {
    await this.ensureBucketExists();
    
    // Generate file hash
    const fileHash = this.generateFileHash(file);
    
    // Create a unique path with user ID to organize files
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const extension = fileName.split('.').pop();
    const uniqueFileName = `${userId}/${timestamp}-${randomString}.${extension}`;
    
    const { data, error } = await supabase.storage
      .from(this.bucketName)
      .upload(uniqueFileName, file, {
        contentType: mimeType,
        upsert: false
      });
    
    if (error) {
      throw new Error(`Failed to upload file: ${error.message}`);
    }
    
    // Get public URL (even if bucket is private, this generates a signed URL)
    const { data: { publicUrl } } = supabase.storage
      .from(this.bucketName)
      .getPublicUrl(data.path);
    
    return {
      path: data.path,
      publicUrl,
      fileHash
    };
  }

  /**
   * Get a signed URL for private file access
   */
  static async getSignedUrl(path: string, expiresIn: number = 3600): Promise<string> {
    const { data, error } = await supabase.storage
      .from(this.bucketName)
      .createSignedUrl(path, expiresIn);
    
    if (error) {
      throw new Error(`Failed to create signed URL: ${error.message}`);
    }
    
    return data.signedUrl;
  }

  /**
   * Download a file from Storage
   */
  static async downloadFile(path: string): Promise<Buffer> {
    const { data, error } = await supabase.storage
      .from(this.bucketName)
      .download(path);
    
    if (error) {
      throw new Error(`Failed to download file: ${error.message}`);
    }
    
    const arrayBuffer = await data.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  /**
   * Delete a file from Storage
   * Note: Delete is disabled by policy for security reasons
   */
  static async deleteFile(path: string): Promise<void> {
    throw new Error('Exclusão de arquivos não é permitida por política de segurança');
  }

  /**
   * List files for a specific user
   */
  static async listUserFiles(userId: string): Promise<any[]> {
    const { data, error } = await supabase.storage
      .from(this.bucketName)
      .list(userId, {
        limit: 100,
        offset: 0,
        sortBy: { column: 'created_at', order: 'desc' }
      });
    
    if (error) {
      throw new Error(`Failed to list files: ${error.message}`);
    }
    
    return data || [];
  }

  /**
   * Move a file to a different path
   */
  static async moveFile(fromPath: string, toPath: string): Promise<void> {
    const { error } = await supabase.storage
      .from(this.bucketName)
      .move(fromPath, toPath);
    
    if (error) {
      throw new Error(`Failed to move file: ${error.message}`);
    }
  }

  /**
   * Get file metadata
   */
  static async getFileMetadata(path: string): Promise<any> {
    const { data, error } = await supabase.storage
      .from(this.bucketName)
      .list(path.split('/').slice(0, -1).join('/'), {
        limit: 1,
        search: path.split('/').pop()
      });
    
    if (error) {
      throw new Error(`Failed to get file metadata: ${error.message}`);
    }
    
    return data?.[0] || null;
  }
}