import { createClient } from '@supabase/supabase-js';
import { broadcastUpdate } from '@/app/api/sse/route';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface ErrorRecoveryResult {
  success: boolean;
  fixed: number;
  retried: number;
  errors: string[];
  message: string;
}

export class ErrorRecoveryService {
  private static isRunning = false;
  private static lastRun = 0;
  private static readonly MIN_INTERVAL = 30000; // 30 seconds minimum between runs

  /**
   * Automatically fix species with error status that actually have media
   */
  static async autoFixErrorStatuses(): Promise<ErrorRecoveryResult> {
    if (this.isRunning) {
      return {
        success: false,
        fixed: 0,
        retried: 0,
        errors: ['Error recovery already in progress'],
        message: 'Recovery already running'
      };
    }

    const now = Date.now();
    if (now - this.lastRun < this.MIN_INTERVAL) {
      return {
        success: false,
        fixed: 0,
        retried: 0,
        errors: ['Too frequent recovery attempts'],
        message: 'Please wait before retrying'
      };
    }

    this.isRunning = true;
    this.lastRun = now;

    try {
      console.log('🔧 Starting automatic error recovery...');

      // Get all species with error status
      const { data: errorSpecies, error: fetchError } = await supabase
        .from('species')
        .select(`
          id, 
          common_name, 
          scientific_name,
          generation_status, 
          image_url, 
          video_url, 
          supabase_image_url, 
          supabase_video_url,
          updated_at
        `)
        .eq('generation_status', 'error');

      if (fetchError) {
        throw new Error(`Failed to fetch error species: ${fetchError.message}`);
      }

      if (!errorSpecies || errorSpecies.length === 0) {
        return {
          success: true,
          fixed: 0,
          retried: 0,
          errors: [],
          message: 'No species with error status found'
        };
      }

      console.log(`Found ${errorSpecies.length} species with error status`);

      let fixedCount = 0;
      let retriedCount = 0;
      const errors: string[] = [];
      const fixedSpecies: any[] = [];

      // Also check species_media table for additional media
      const speciesIds = errorSpecies.map(s => s.id);
      const { data: mediaData } = await supabase
        .from('species_media')
        .select('species_id, media_type, supabase_url, replicate_url')
        .in('species_id', speciesIds)
        .not('supabase_url', 'is', null);

      // Create a map of species with media in species_media table
      const speciesWithMedia = new Set(mediaData?.map(m => m.species_id) || []);

      for (const species of errorSpecies) {
        try {
          // Check if species has any media (legacy fields or new media table)
          const hasLegacyImage = species.image_url || species.supabase_image_url;
          const hasLegacyVideo = species.video_url || species.supabase_video_url;
          const hasNewMedia = speciesWithMedia.has(species.id);

          if (hasLegacyImage || hasLegacyVideo || hasNewMedia) {
            // Species has media but is marked as error - fix it
            const { error: updateError } = await supabase
              .from('species')
              .update({
                generation_status: 'completed',
                updated_at: new Date().toISOString()
              })
              .eq('id', species.id);

            if (updateError) {
              console.error(`Error updating species ${species.common_name}:`, updateError);
              errors.push(`Failed to update ${species.common_name}: ${updateError.message}`);
            } else {
              console.log(`✅ Auto-fixed status for ${species.common_name}`);
              fixedCount++;
              fixedSpecies.push(species);
            }
          } else {
            // Check if error is old (more than 2 minutes) and retry
            const updatedAt = new Date(species.updated_at);
            const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
            
            if (updatedAt < twoMinutesAgo) {
              // Reset to pending for retry
              const { error: retryError } = await supabase
                .from('species')
                .update({
                  generation_status: 'pending',
                  updated_at: new Date().toISOString()
                })
                .eq('id', species.id);

              if (retryError) {
                console.error(`Error retrying species ${species.common_name}:`, retryError);
                errors.push(`Failed to retry ${species.common_name}: ${retryError.message}`);
              } else {
                console.log(`🔄 Reset ${species.common_name} to pending for retry`);
                retriedCount++;
              }
            } else {
              console.log(`⏳ ${species.common_name} error is recent (${Math.round((Date.now() - updatedAt.getTime()) / 1000)}s ago), waiting before retry`);
            }
          }
        } catch (error) {
          console.error(`Error processing species ${species.common_name}:`, error);
          errors.push(`Error processing ${species.common_name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      // Broadcast updates for fixed species
      if (fixedSpecies.length > 0) {
        for (const species of fixedSpecies) {
          broadcastUpdate({
            type: 'species_updated',
            message: `Status fixed for ${species.common_name}`,
            timestamp: new Date().toISOString(),
            data: {
              speciesId: species.id,
              speciesName: species.common_name,
              status: 'completed'
            }
          });
        }
      }

      console.log(`🎉 Auto-recovery completed: ${fixedCount} fixed, ${retriedCount} retried`);

      return {
        success: true,
        fixed: fixedCount,
        retried: retriedCount,
        errors,
        message: `Auto-recovery completed: ${fixedCount} fixed, ${retriedCount} retried`
      };

    } catch (error) {
      console.error('Error in auto-recovery:', error);
      return {
        success: false,
        fixed: 0,
        retried: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        message: 'Auto-recovery failed'
      };
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Check for stuck generations and reset them
   */
  static async resetStuckGenerations(): Promise<ErrorRecoveryResult> {
    try {
      console.log('🔄 Checking for stuck generations...');

      // Find species that have been generating for more than 10 minutes
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();

      const { data: stuckSpecies, error: fetchError } = await supabase
        .from('species')
        .select('id, common_name, generation_status, updated_at')
        .in('generation_status', ['generating_image', 'generating_video'])
        .lt('updated_at', tenMinutesAgo);

      if (fetchError) {
        throw new Error(`Failed to fetch stuck generations: ${fetchError.message}`);
      }

      if (!stuckSpecies || stuckSpecies.length === 0) {
        return {
          success: true,
          fixed: 0,
          retried: 0,
          errors: [],
          message: 'No stuck generations found'
        };
      }

      console.log(`Found ${stuckSpecies.length} stuck generations`);

      let resetCount = 0;
      const errors: string[] = [];

      for (const species of stuckSpecies) {
        try {
          const { error: resetError } = await supabase
            .from('species')
            .update({ 
              generation_status: 'pending',
              updated_at: new Date().toISOString()
            })
            .eq('id', species.id);

          if (resetError) {
            console.error(`Error resetting stuck generation for ${species.common_name}:`, resetError);
            errors.push(`Failed to reset ${species.common_name}: ${resetError.message}`);
          } else {
            console.log(`🔄 Reset stuck generation for ${species.common_name}`);
            resetCount++;

            // Broadcast update
            broadcastUpdate({
              type: 'species_updated',
              message: `Reset stuck generation for ${species.common_name}`,
              timestamp: new Date().toISOString(),
              data: {
                speciesId: species.id,
                speciesName: species.common_name,
                status: 'pending'
              }
            });
          }
        } catch (error) {
          console.error(`Error processing stuck generation for ${species.common_name}:`, error);
          errors.push(`Error processing ${species.common_name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      return {
        success: true,
        fixed: resetCount,
        retried: 0,
        errors,
        message: `Reset ${resetCount} stuck generations`
      };

    } catch (error) {
      console.error('Error in resetStuckGenerations:', error);
      return {
        success: false,
        fixed: 0,
        retried: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        message: 'Failed to reset stuck generations'
      };
    }
  }

  /**
   * Run comprehensive error recovery
   */
  static async runComprehensiveRecovery(): Promise<ErrorRecoveryResult> {
    try {
      console.log('🚀 Starting comprehensive error recovery...');

      // Run both recovery processes
      const [errorResult, stuckResult] = await Promise.all([
        this.autoFixErrorStatuses(),
        this.resetStuckGenerations()
      ]);

      return {
        success: errorResult.success && stuckResult.success,
        fixed: errorResult.fixed + stuckResult.fixed,
        retried: errorResult.retried + stuckResult.retried,
        errors: [...errorResult.errors, ...stuckResult.errors],
        message: `Comprehensive recovery: ${errorResult.fixed + stuckResult.fixed} fixed, ${errorResult.retried + stuckResult.retried} retried`
      };

    } catch (error) {
      console.error('Error in comprehensive recovery:', error);
      return {
        success: false,
        fixed: 0,
        retried: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        message: 'Comprehensive recovery failed'
      };
    }
  }
}