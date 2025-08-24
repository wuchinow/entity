import { createClient } from '@supabase/supabase-js';
import { broadcastUpdate } from '@/app/api/sse/route';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface QueueItem {
  id: string;
  speciesId: string;
  mediaType: 'image' | 'video';
  status: 'queued' | 'processing' | 'completed' | 'failed';
  priority: number;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
  metadata?: {
    imageUrl?: string;
    seedImageVersion?: number;
    speciesName?: string;
  };
}

class GenerationQueueService {
  private static instance: GenerationQueueService;
  private queue: QueueItem[] = [];
  private processing: Set<string> = new Set();
  private readonly MAX_CONCURRENT_IMAGES = 2;
  private readonly MAX_CONCURRENT_VIDEOS = 1; // Videos are more resource intensive
  private readonly MAX_QUEUE_SIZE = 20;

  static getInstance(): GenerationQueueService {
    if (!GenerationQueueService.instance) {
      GenerationQueueService.instance = new GenerationQueueService();
    }
    return GenerationQueueService.instance;
  }

  /**
   * Add a new generation request to the queue
   */
  async addToQueue(
    speciesId: string,
    mediaType: 'image' | 'video',
    metadata?: QueueItem['metadata']
  ): Promise<{ success: boolean; queueItem?: QueueItem; error?: string; position?: number }> {
    try {
      // Check if queue is full
      if (this.queue.length >= this.MAX_QUEUE_SIZE) {
        return {
          success: false,
          error: `Queue is full (${this.MAX_QUEUE_SIZE} items). Please try again later.`
        };
      }

      // Check if this species already has a pending request for this media type
      const existingItem = this.queue.find(
        item => item.speciesId === speciesId && 
                item.mediaType === mediaType && 
                (item.status === 'queued' || item.status === 'processing')
      );

      if (existingItem) {
        const position = this.getQueuePosition(existingItem.id);
        return {
          success: false,
          error: `${mediaType} generation already in progress for this species`,
          queueItem: existingItem,
          position
        };
      }

      // Check current species status in database
      const { data: species, error: speciesError } = await supabase
        .from('species')
        .select('generation_status, common_name')
        .eq('id', speciesId)
        .single();

      if (speciesError || !species) {
        return {
          success: false,
          error: 'Species not found'
        };
      }

      // Don't queue if already generating
      if (species.generation_status === 'generating_image' || species.generation_status === 'generating_video') {
        return {
          success: false,
          error: `Generation already in progress for ${species.common_name}`
        };
      }

      // Create queue item
      const queueItem: QueueItem = {
        id: `${speciesId}-${mediaType}-${Date.now()}`,
        speciesId,
        mediaType,
        status: 'queued',
        priority: mediaType === 'image' ? 1 : 2, // Images have higher priority
        createdAt: new Date(),
        metadata: {
          ...metadata,
          speciesName: species.common_name
        }
      };

      // Add to queue and sort by priority
      this.queue.push(queueItem);
      this.queue.sort((a, b) => a.priority - b.priority || a.createdAt.getTime() - b.createdAt.getTime());

      // Update species status to queued
      await supabase
        .from('species')
        .update({
          generation_status: `queued_${mediaType}`,
          updated_at: new Date().toISOString()
        })
        .eq('id', speciesId);

      const position = this.getQueuePosition(queueItem.id);

      // Broadcast queue update
      broadcastUpdate({
        type: 'queue_updated',
        timestamp: new Date().toISOString(),
        data: {
          speciesId,
          mediaType,
          status: 'queued',
          position,
          queueLength: this.queue.length,
          speciesName: species.common_name
        }
      });

      // Try to process queue
      this.processQueue();

      return {
        success: true,
        queueItem,
        position
      };

    } catch (error) {
      console.error('Error adding to queue:', error);
      return {
        success: false,
        error: 'Failed to add to queue'
      };
    }
  }

  /**
   * Get the position of an item in the queue
   */
  getQueuePosition(itemId: string): number {
    const index = this.queue.findIndex(item => item.id === itemId && item.status === 'queued');
    return index >= 0 ? index + 1 : -1;
  }

  /**
   * Get queue status for a species
   */
  getQueueStatus(speciesId: string, mediaType: 'image' | 'video'): {
    inQueue: boolean;
    position?: number;
    status?: string;
    estimatedWaitTime?: number;
  } {
    const item = this.queue.find(
      item => item.speciesId === speciesId && item.mediaType === mediaType
    );

    if (!item) {
      return { inQueue: false };
    }

    const position = this.getQueuePosition(item.id);
    const estimatedWaitTime = this.calculateEstimatedWaitTime(position, mediaType);

    return {
      inQueue: true,
      position: position > 0 ? position : undefined,
      status: item.status,
      estimatedWaitTime
    };
  }

  /**
   * Calculate estimated wait time based on queue position and media type
   */
  private calculateEstimatedWaitTime(position: number, mediaType: 'image' | 'video'): number {
    if (position <= 0) return 0;

    // Rough estimates based on typical generation times
    const imageTime = 30; // 30 seconds per image
    const videoTime = 180; // 3 minutes per video

    const avgTime = mediaType === 'image' ? imageTime : videoTime;
    return position * avgTime;
  }

  /**
   * Process the queue - start new generations if slots available
   */
  private async processQueue(): Promise<void> {
    const currentImageProcessing = Array.from(this.processing).filter(id => 
      this.queue.find(item => item.id === id)?.mediaType === 'image'
    ).length;

    const currentVideoProcessing = Array.from(this.processing).filter(id => 
      this.queue.find(item => item.id === id)?.mediaType === 'video'
    ).length;

    // Process images if slots available
    if (currentImageProcessing < this.MAX_CONCURRENT_IMAGES) {
      const nextImageItem = this.queue.find(
        item => item.mediaType === 'image' && item.status === 'queued'
      );

      if (nextImageItem) {
        this.startProcessing(nextImageItem);
      }
    }

    // Process videos if slots available
    if (currentVideoProcessing < this.MAX_CONCURRENT_VIDEOS) {
      const nextVideoItem = this.queue.find(
        item => item.mediaType === 'video' && item.status === 'queued'
      );

      if (nextVideoItem) {
        this.startProcessing(nextVideoItem);
      }
    }
  }

  /**
   * Start processing a queue item
   */
  private async startProcessing(item: QueueItem): Promise<void> {
    try {
      item.status = 'processing';
      item.startedAt = new Date();
      this.processing.add(item.id);

      // Update species status
      await supabase
        .from('species')
        .update({
          generation_status: `generating_${item.mediaType}`,
          updated_at: new Date().toISOString()
        })
        .eq('id', item.speciesId);

      // Broadcast processing update
      broadcastUpdate({
        type: 'generation_started',
        timestamp: new Date().toISOString(),
        data: {
          speciesId: item.speciesId,
          mediaType: item.mediaType,
          speciesName: item.metadata?.speciesName
        }
      });

      // Call the appropriate generation function
      if (item.mediaType === 'image') {
        await this.processImageGeneration(item);
      } else {
        await this.processVideoGeneration(item);
      }

    } catch (error) {
      console.error(`Error processing ${item.mediaType} generation:`, error);
      await this.markItemFailed(item, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  /**
   * Process image generation (extracted from existing route)
   */
  private async processImageGeneration(item: QueueItem): Promise<void> {
    // This would contain the actual image generation logic
    // For now, we'll import and call the existing generation logic
    const { generateImage } = await import('./image-generator');
    
    try {
      await generateImage(item.speciesId);
      await this.markItemCompleted(item);
    } catch (error) {
      await this.markItemFailed(item, error instanceof Error ? error.message : 'Image generation failed');
    }
  }

  /**
   * Process video generation (extracted from existing route)
   */
  private async processVideoGeneration(item: QueueItem): Promise<void> {
    // This would contain the actual video generation logic
    const { generateVideo } = await import('./video-generator');
    
    try {
      if (!item.metadata?.imageUrl) {
        throw new Error('Image URL required for video generation');
      }
      
      await generateVideo(item.speciesId, item.metadata.imageUrl, item.metadata.seedImageVersion);
      await this.markItemCompleted(item);
    } catch (error) {
      await this.markItemFailed(item, error instanceof Error ? error.message : 'Video generation failed');
    }
  }

  /**
   * Mark an item as completed and remove from processing
   */
  private async markItemCompleted(item: QueueItem): Promise<void> {
    item.status = 'completed';
    item.completedAt = new Date();
    this.processing.delete(item.id);

    // Remove from queue after a delay to allow status checking
    setTimeout(() => {
      this.queue = this.queue.filter(queueItem => queueItem.id !== item.id);
    }, 30000); // Keep for 30 seconds

    // Broadcast completion
    broadcastUpdate({
      type: 'generation_completed',
      timestamp: new Date().toISOString(),
      data: {
        speciesId: item.speciesId,
        mediaType: item.mediaType,
        speciesName: item.metadata?.speciesName
      }
    });

    // Process next items in queue
    this.processQueue();
  }

  /**
   * Mark an item as failed and remove from processing
   */
  private async markItemFailed(item: QueueItem, error: string): Promise<void> {
    item.status = 'failed';
    item.error = error;
    item.completedAt = new Date();
    this.processing.delete(item.id);

    // Update species status to error
    await supabase
      .from('species')
      .update({
        generation_status: 'error',
        updated_at: new Date().toISOString()
      })
      .eq('id', item.speciesId);

    // Broadcast failure
    broadcastUpdate({
      type: 'generation_failed',
      timestamp: new Date().toISOString(),
      data: {
        speciesId: item.speciesId,
        mediaType: item.mediaType,
        error,
        speciesName: item.metadata?.speciesName
      }
    });

    // Remove from queue after a delay
    setTimeout(() => {
      this.queue = this.queue.filter(queueItem => queueItem.id !== item.id);
    }, 60000); // Keep failed items for 1 minute

    // Process next items in queue
    this.processQueue();
  }

  /**
   * Get current queue statistics
   */
  getQueueStats(): {
    totalQueued: number;
    totalProcessing: number;
    imageQueued: number;
    videoQueued: number;
    imageProcessing: number;
    videoProcessing: number;
  } {
    const queued = this.queue.filter(item => item.status === 'queued');
    const processing = this.queue.filter(item => item.status === 'processing');

    return {
      totalQueued: queued.length,
      totalProcessing: processing.length,
      imageQueued: queued.filter(item => item.mediaType === 'image').length,
      videoQueued: queued.filter(item => item.mediaType === 'video').length,
      imageProcessing: processing.filter(item => item.mediaType === 'image').length,
      videoProcessing: processing.filter(item => item.mediaType === 'video').length
    };
  }

  /**
   * Get full queue status for admin/debugging
   */
  getFullQueueStatus(): QueueItem[] {
    return [...this.queue];
  }
}

export const generationQueue = GenerationQueueService.getInstance();