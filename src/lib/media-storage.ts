import { supabaseAdmin } from './supabase';

export class MediaStorageService {
  private static readonly BUCKET_NAME = 'species-media';
  private static readonly IMAGE_FOLDER = 'images';
  private static readonly VIDEO_FOLDER = 'videos';

  /**
   * Initialize the storage bucket if it doesn't exist
   */
  static async initializeBucket(): Promise<void> {
    try {
      // Check if bucket exists
      const { data: buckets } = await supabaseAdmin.storage.listBuckets();
      const bucketExists = buckets?.some(bucket => bucket.name === this.BUCKET_NAME);

      if (!bucketExists) {
        // Create bucket
        const { error: createError } = await supabaseAdmin.storage.createBucket(this.BUCKET_NAME, {
          public: true,
          allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm'],
          fileSizeLimit: 100 * 1024 * 1024 // 100MB limit
        });

        if (createError) {
          console.error('Error creating storage bucket:', createError);
          throw createError;
        }

        console.log(`Created storage bucket: ${this.BUCKET_NAME}`);
      }
    } catch (error) {
      console.error('Error initializing storage bucket:', error);
      throw error;
    }
  }

  /**
   * Download a file from a URL and upload it to Supabase Storage
   */
  static async downloadAndStore(
    url: string,
    speciesId: string,
    type: 'image' | 'video',
    commonName: string
  ): Promise<{ path: string; publicUrl: string }> {
    try {
      // Download the file from the URL
      console.log(`Downloading ${type} from:`, url);
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Failed to download ${type}: ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Determine file extension from content type or URL
      const contentType = response.headers.get('content-type') || '';
      let extension = '';
      
      if (type === 'image') {
        if (contentType.includes('jpeg') || contentType.includes('jpg')) extension = '.jpg';
        else if (contentType.includes('png')) extension = '.png';
        else if (contentType.includes('webp')) extension = '.webp';
        else extension = '.jpg'; // default
      } else {
        if (contentType.includes('mp4')) extension = '.mp4';
        else if (contentType.includes('webm')) extension = '.webm';
        else extension = '.mp4'; // default
      }

      // Create file path
      const folder = type === 'image' ? this.IMAGE_FOLDER : this.VIDEO_FOLDER;
      const sanitizedName = commonName.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
      const timestamp = Date.now();
      const fileName = `${sanitizedName}_${speciesId.slice(0, 8)}_${timestamp}${extension}`;
      const filePath = `${folder}/${fileName}`;

      // Upload to Supabase Storage
      console.log(`Uploading ${type} to:`, filePath);
      const { error: uploadError } = await supabaseAdmin.storage
        .from(this.BUCKET_NAME)
        .upload(filePath, buffer, {
          contentType: contentType || (type === 'image' ? 'image/jpeg' : 'video/mp4'),
          upsert: false
        });

      if (uploadError) {
        console.error(`Error uploading ${type}:`, uploadError);
        throw uploadError;
      }

      // Get public URL
      const { data: publicUrlData } = supabaseAdmin.storage
        .from(this.BUCKET_NAME)
        .getPublicUrl(filePath);

      console.log(`Successfully stored ${type} at:`, publicUrlData.publicUrl);

      return {
        path: filePath,
        publicUrl: publicUrlData.publicUrl
      };

    } catch (error) {
      console.error(`Error downloading and storing ${type}:`, error);
      throw error;
    }
  }

  /**
   * Delete a file from Supabase Storage
   */
  static async deleteFile(filePath: string): Promise<void> {
    try {
      const { error } = await supabaseAdmin.storage
        .from(this.BUCKET_NAME)
        .remove([filePath]);

      if (error) {
        console.error('Error deleting file:', error);
        throw error;
      }

      console.log('Successfully deleted file:', filePath);
    } catch (error) {
      console.error('Error deleting file:', error);
      throw error;
    }
  }

  /**
   * Get public URL for a stored file
   */
  static getPublicUrl(filePath: string): string {
    const { data } = supabaseAdmin.storage
      .from(this.BUCKET_NAME)
      .getPublicUrl(filePath);
    
    return data.publicUrl;
  }

  /**
   * Check if a file exists in storage
   */
  static async fileExists(filePath: string): Promise<boolean> {
    try {
      const { data, error } = await supabaseAdmin.storage
        .from(this.BUCKET_NAME)
        .list(filePath.split('/').slice(0, -1).join('/'));

      if (error) return false;

      const fileName = filePath.split('/').pop();
      return data?.some(file => file.name === fileName) || false;
    } catch {
      return false;
    }
  }

  /**
   * Get storage statistics
   */
  static async getStorageStats(): Promise<{
    totalFiles: number;
    totalSize: number;
    imageCount: number;
    videoCount: number;
  }> {
    try {
      const { data: imageFiles } = await supabaseAdmin.storage
        .from(this.BUCKET_NAME)
        .list(this.IMAGE_FOLDER);

      const { data: videoFiles } = await supabaseAdmin.storage
        .from(this.BUCKET_NAME)
        .list(this.VIDEO_FOLDER);

      const imageCount = imageFiles?.length || 0;
      const videoCount = videoFiles?.length || 0;
      const totalFiles = imageCount + videoCount;

      // Calculate total size (this is approximate since we don't have individual file sizes)
      const totalSize = totalFiles * 5 * 1024 * 1024; // Estimate 5MB per file

      return {
        totalFiles,
        totalSize,
        imageCount,
        videoCount
      };
    } catch (error) {
      console.error('Error getting storage stats:', error);
      return {
        totalFiles: 0,
        totalSize: 0,
        imageCount: 0,
        videoCount: 0
      };
    }
  }
}