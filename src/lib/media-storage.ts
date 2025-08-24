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
      if (!supabaseAdmin) {
        throw new Error('Supabase admin client not initialized');
      }
      
      // Check if bucket exists
      const { data: buckets, error: listError } = await supabaseAdmin.storage.listBuckets();
      
      if (listError) {
        console.error('Error listing buckets:', listError);
        throw listError;
      }
      
      const bucketExists = buckets?.some(bucket => bucket.name === this.BUCKET_NAME);

      if (!bucketExists) {
        console.log(`Creating storage bucket: ${this.BUCKET_NAME}`);
        
        // Create bucket with proper configuration
        const { error: createError } = await supabaseAdmin.storage.createBucket(this.BUCKET_NAME, {
          public: true,
          allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm'],
          fileSizeLimit: 50 * 1024 * 1024 // 50MB limit per file
        });

        if (createError) {
          console.error('Error creating storage bucket:', createError);
          throw createError;
        }

        console.log(`Successfully created storage bucket: ${this.BUCKET_NAME}`);
        
        // Create folder structure
        await this.createFolderStructure();
      } else {
        console.log(`Storage bucket ${this.BUCKET_NAME} already exists`);
      }
    } catch (error) {
      console.error('Error initializing storage bucket:', error);
      throw error;
    }
  }

  /**
   * Create folder structure in the bucket
   */
  private static async createFolderStructure(): Promise<void> {
    try {
      if (!supabaseAdmin) return;
      
      // Create placeholder files to establish folder structure
      const placeholderContent = new Uint8Array([]);
      
      await Promise.all([
        supabaseAdmin.storage
          .from(this.BUCKET_NAME)
          .upload(`${this.IMAGE_FOLDER}/.placeholder`, placeholderContent, {
            contentType: 'text/plain',
            upsert: true
          }),
        supabaseAdmin.storage
          .from(this.BUCKET_NAME)
          .upload(`${this.VIDEO_FOLDER}/.placeholder`, placeholderContent, {
            contentType: 'text/plain',
            upsert: true
          })
      ]);
      
      console.log('Created folder structure in storage bucket');
    } catch (error) {
      console.warn('Could not create folder structure:', error);
      // Don't throw - this is not critical
    }
  }

  /**
   * Download a file from a URL and upload it to Supabase Storage with retry logic
   */
  static async downloadAndStore(
    url: string,
    speciesId: string,
    type: 'image' | 'video',
    commonName: string,
    version: number = 1,
    maxRetries: number = 3
  ): Promise<{ path: string; publicUrl: string }> {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`Attempt ${attempt}/${maxRetries}: Downloading and storing ${type} for ${commonName}`);
        
        // Auto-initialize bucket on first use
        await this.initializeBucket();

        // Download the file from the URL with timeout
        console.log(`Downloading ${type} from:`, url);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout
        
        const response = await fetch(url, {
          signal: controller.signal,
          headers: {
            'User-Agent': 'Entity-v1.0-Media-Downloader'
          }
        });
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          throw new Error(`Failed to download ${type}: ${response.status} ${response.statusText}`);
        }

        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        
        // Validate file size
        if (buffer.length === 0) {
          throw new Error(`Downloaded ${type} file is empty`);
        }
        
        if (buffer.length > 50 * 1024 * 1024) { // 50MB limit
          throw new Error(`Downloaded ${type} file is too large: ${Math.round(buffer.length / 1024 / 1024)}MB`);
        }

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

        // Create file path with version support
        const folder = type === 'image' ? this.IMAGE_FOLDER : this.VIDEO_FOLDER;
        const safeName = (commonName || 'unknown_species').toString();
        const sanitizedName = safeName.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
        const safeSpeciesId = (speciesId || 'unknown').toString();
        const timestamp = Date.now();
        const fileName = `${sanitizedName}_${safeSpeciesId.slice(0, 8)}_v${version}_${timestamp}${extension}`;
        const filePath = `${folder}/${fileName}`;

        if (!supabaseAdmin) {
          throw new Error('Supabase admin client not initialized');
        }
        
        // Upload to Supabase Storage
        console.log(`Uploading ${type} to:`, filePath, `(${Math.round(buffer.length / 1024)}KB)`);
        const { error: uploadError } = await supabaseAdmin.storage
          .from(this.BUCKET_NAME)
          .upload(filePath, buffer, {
            contentType: contentType || (type === 'image' ? 'image/jpeg' : 'video/mp4'),
            upsert: false
          });

        if (uploadError) {
          console.error(`Error uploading ${type}:`, uploadError);
          throw new Error(`Upload failed: ${uploadError.message}`);
        }

        // Get public URL
        const { data: publicUrlData } = supabaseAdmin.storage
          .from(this.BUCKET_NAME)
          .getPublicUrl(filePath);

        // Verify the file was uploaded successfully with retry logic
        let fileExists = false;
        for (let verifyAttempt = 1; verifyAttempt <= 3; verifyAttempt++) {
          // Add a small delay to allow Supabase Storage to process the upload
          if (verifyAttempt > 1) {
            await new Promise(resolve => setTimeout(resolve, 1000 * verifyAttempt));
          }
          
          fileExists = await this.fileExists(filePath);
          if (fileExists) {
            break;
          }
          
          console.log(`File verification attempt ${verifyAttempt}/3 failed for ${filePath}`);
        }
        
        if (!fileExists) {
          console.warn(`File verification failed after 3 attempts: ${filePath} - proceeding anyway as upload succeeded`);
          // Don't throw error - if upload succeeded, the file should be accessible
        }

        console.log(`✅ Successfully stored ${type} at:`, publicUrlData.publicUrl);

        return {
          path: filePath,
          publicUrl: publicUrlData.publicUrl
        };

      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.error(`Attempt ${attempt}/${maxRetries} failed for ${type} storage:`, lastError.message);
        
        if (attempt < maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000); // Exponential backoff, max 10s
          console.log(`Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw new Error(`Failed to download and store ${type} after ${maxRetries} attempts. Last error: ${lastError?.message}`);
  }

  /**
   * Delete a file from Supabase Storage
   */
  static async deleteFile(filePath: string): Promise<void> {
    try {
      if (!supabaseAdmin) {
        throw new Error('Supabase admin client not initialized');
      }
      
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
    if (!supabaseAdmin) {
      throw new Error('Supabase admin client not initialized');
    }
    
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
      if (!supabaseAdmin) {
        return false;
      }
      
      // Try to get the file info directly first
      const { data: fileData, error: fileError } = await supabaseAdmin.storage
        .from(this.BUCKET_NAME)
        .getPublicUrl(filePath);
      
      if (fileData?.publicUrl) {
        // Try to fetch the file to verify it exists
        try {
          const response = await fetch(fileData.publicUrl, { method: 'HEAD' });
          if (response.ok) {
            return true;
          }
        } catch {
          // Fall through to list method
        }
      }
      
      // Fallback to list method
      const folderPath = filePath.split('/').slice(0, -1).join('/');
      const { data, error } = await supabaseAdmin.storage
        .from(this.BUCKET_NAME)
        .list(folderPath);

      if (error) {
        console.warn('Error listing files for existence check:', error);
        return false;
      }

      const fileName = filePath.split('/').pop();
      return data?.some(file => file.name === fileName) || false;
    } catch (error) {
      console.warn('Error checking file existence:', error);
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
      if (!supabaseAdmin) {
        throw new Error('Supabase admin client not initialized');
      }
      
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