import { Species, GenerationQueue } from '@/types';
import { SupabaseService } from './supabase';
import { ReplicateService, RateLimiter } from './replicate';

export class GenerationService {
  private static isProcessing = false;
  private static processingQueue: string[] = [];

  // Start the generation process for a species
  static async startGeneration(speciesId: string): Promise<void> {
    try {
      // Update species status
      await SupabaseService.updateSpecies(speciesId, {
        generation_status: 'generating_image'
      });

      // Add image generation to queue
      await SupabaseService.addToQueue({
        species_id: speciesId,
        generation_type: 'image',
        status: 'queued'
      });

      // Process the queue
      this.processQueue();
    } catch (error) {
      console.error('Error starting generation:', error);
      await SupabaseService.updateSpecies(speciesId, {
        generation_status: 'error'
      });
    }
  }

  // Process the generation queue
  static async processQueue(): Promise<void> {
    if (this.isProcessing) return;
    
    this.isProcessing = true;
    
    try {
      const queueItems = await SupabaseService.getQueuedItems();
      
      for (const item of queueItems) {
        if (this.processingQueue.includes(item.id)) continue;
        
        this.processingQueue.push(item.id);
        
        try {
          await this.processQueueItem(item);
        } catch (error) {
          console.error(`Error processing queue item ${item.id}:`, error);
          await SupabaseService.updateQueueItem(item.id, {
            status: 'failed',
            error_message: error instanceof Error ? error.message : 'Unknown error',
            completed_at: new Date().toISOString()
          });
        } finally {
          this.processingQueue = this.processingQueue.filter(id => id !== item.id);
        }
      }
    } catch (error) {
      console.error('Error processing queue:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  // Process a single queue item
  private static async processQueueItem(item: GenerationQueue): Promise<void> {
    // Check rate limits
    if (!(await RateLimiter.checkRateLimit())) {
      console.log('Rate limit reached, waiting...');
      await new Promise(resolve => setTimeout(resolve, 60000)); // Wait 1 minute
      return;
    }

    // Get species data
    const species = await SupabaseService.getSpeciesById(item.species_id);
    if (!species) {
      throw new Error('Species not found');
    }

    // Update queue item status
    await SupabaseService.updateQueueItem(item.id, {
      status: 'processing',
      started_at: new Date().toISOString()
    });

    if (item.generation_type === 'image') {
      await this.generateImage(item, species);
    } else if (item.generation_type === 'video') {
      await this.generateVideo(item, species);
    }
  }

  // Generate image for species
  private static async generateImage(item: GenerationQueue, species: Species): Promise<void> {
    try {
      RateLimiter.recordRequest();
      
      const result = await ReplicateService.generateImage(species.common_name);
      
      // Update queue item with prediction ID
      await SupabaseService.updateQueueItem(item.id, {
        replicate_prediction_id: result.id
      });

      // Poll for completion
      await this.pollPrediction(item, species, 'image');
      
    } catch (error) {
      console.error('Error generating image:', error);
      throw error;
    }
  }

  // Generate video for species
  private static async generateVideo(item: GenerationQueue, species: Species): Promise<void> {
    try {
      RateLimiter.recordRequest();
      
      const result = await ReplicateService.generateVideo(species.common_name);
      
      // Update queue item with prediction ID
      await SupabaseService.updateQueueItem(item.id, {
        replicate_prediction_id: result.id
      });

      // Poll for completion
      await this.pollPrediction(item, species, 'video');
      
    } catch (error) {
      console.error('Error generating video:', error);
      throw error;
    }
  }

  // Poll Replicate prediction until completion
  private static async pollPrediction(
    item: GenerationQueue, 
    species: Species, 
    type: 'image' | 'video'
  ): Promise<void> {
    const maxAttempts = 60; // 5 minutes with 5-second intervals
    let attempts = 0;

    while (attempts < maxAttempts) {
      try {
        const prediction = await ReplicateService.getPrediction(item.replicate_prediction_id!);
        
        if (prediction.status === 'succeeded') {
          // Update species with generated media URL
          const updateData: Partial<Species> = {};
          
          if (type === 'image' && prediction.output) {
            const imageUrl = Array.isArray(prediction.output) ? prediction.output[0] : prediction.output;
            updateData.image_url = imageUrl;
            updateData.image_generated_at = new Date().toISOString();
            
            // Queue video generation
            await SupabaseService.addToQueue({
              species_id: species.id,
              generation_type: 'video',
              status: 'queued'
            });
            
            updateData.generation_status = 'generating_video';
          } else if (type === 'video' && prediction.output) {
            updateData.video_url = prediction.output as string;
            updateData.video_generated_at = new Date().toISOString();
            updateData.generation_status = 'completed';
          }
          
          await SupabaseService.updateSpecies(species.id, updateData);
          
          // Mark queue item as completed
          await SupabaseService.updateQueueItem(item.id, {
            status: 'completed',
            completed_at: new Date().toISOString()
          });
          
          // Continue processing queue for video generation
          if (type === 'image') {
            setTimeout(() => this.processQueue(), 1000);
          }
          
          return;
        } else if (prediction.status === 'failed') {
          throw new Error(prediction.error || 'Generation failed');
        }
        
        // Wait before next poll
        await new Promise(resolve => setTimeout(resolve, 5000));
        attempts++;
        
      } catch (error) {
        console.error('Error polling prediction:', error);
        attempts++;
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
    
    throw new Error('Prediction polling timed out');
  }

  // Get next species in sequence
  static async getNextSpecies(currentSpeciesId?: string): Promise<Species | null> {
    const allSpecies = await SupabaseService.getAllSpecies();
    
    if (allSpecies.length === 0) return null;
    
    if (!currentSpeciesId) {
      return allSpecies[0];
    }
    
    const currentIndex = allSpecies.findIndex(s => s.id === currentSpeciesId);
    
    if (currentIndex === -1 || currentIndex === allSpecies.length - 1) {
      // Loop back to beginning or species not found
      return allSpecies[0];
    }
    
    return allSpecies[currentIndex + 1];
  }

  // Advance to next species
  static async advanceToNextSpecies(): Promise<Species | null> {
    try {
      const systemState = await SupabaseService.getSystemState();
      const nextSpecies = await this.getNextSpecies(systemState?.current_species_id);
      
      if (!nextSpecies) return null;
      
      // Update system state
      await SupabaseService.updateSystemState({
        current_species_id: nextSpecies.id,
        cycle_started_at: new Date().toISOString()
      });
      
      // Start generation if not already completed
      if (nextSpecies.generation_status === 'pending') {
        await this.startGeneration(nextSpecies.id);
      }
      
      return nextSpecies;
    } catch (error) {
      console.error('Error advancing to next species:', error);
      return null;
    }
  }

  // Start automatic cycling
  static async startCycling(): Promise<void> {
    await SupabaseService.updateSystemState({
      is_cycling: true
    });
    
    // Start with first species if none is current
    const systemState = await SupabaseService.getSystemState();
    if (!systemState?.current_species_id) {
      await this.advanceToNextSpecies();
    }
  }

  // Stop automatic cycling
  static async stopCycling(): Promise<void> {
    await SupabaseService.updateSystemState({
      is_cycling: false
    });
  }

  // Check if cycling should advance (called by cron job)
  static async checkCycleAdvancement(): Promise<boolean> {
    try {
      const systemState = await SupabaseService.getSystemState();
      
      if (!systemState?.is_cycling || !systemState.cycle_started_at) {
        return false;
      }
      
      const cycleStarted = new Date(systemState.cycle_started_at);
      const now = new Date();
      const minutesElapsed = (now.getTime() - cycleStarted.getTime()) / (1000 * 60);
      const cycleMinutes = parseInt(process.env.GENERATION_CYCLE_MINUTES || '7');
      
      if (minutesElapsed >= cycleMinutes) {
        await this.advanceToNextSpecies();
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error checking cycle advancement:', error);
      return false;
    }
  }
}