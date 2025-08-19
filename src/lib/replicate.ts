import Replicate from 'replicate';
import { ReplicateImageResponse, ReplicateVideoResponse } from '@/types';

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN!,
});

export class ReplicateService {
  // Image generation using Flux Context model
  static async generateImage(speciesName: string): Promise<ReplicateImageResponse> {
    try {
      const prompt = `birth of ${speciesName}`;
      
      const prediction = await replicate.predictions.create({
        version: "dev", // Flux Context model version - update with actual version
        input: {
          prompt,
          aspect_ratio: "16:9",
          output_format: "webp",
          output_quality: 80,
          safety_tolerance: 2,
          prompt_upsampling: true
        },
      });

      return {
        id: prediction.id,
        status: prediction.status as ReplicateImageResponse['status'],
        output: prediction.output as string[],
        error: prediction.error as string | undefined,
      };
    } catch (error) {
      console.error('Error generating image:', error);
      throw error;
    }
  }

  // Video generation using Kling 1.6 model
  static async generateVideo(speciesName: string): Promise<ReplicateVideoResponse> {
    try {
      const prompt = `birth of ${speciesName}`;
      
      const prediction = await replicate.predictions.create({
        version: "dev", // Kling 1.6 model version - update with actual version
        input: {
          prompt,
          duration: 5,
          aspect_ratio: "16:9",
          resolution: "720p",
          fps: 24
        },
      });

      return {
        id: prediction.id,
        status: prediction.status as ReplicateVideoResponse['status'],
        output: prediction.output as string,
        error: prediction.error as string | undefined,
      };
    } catch (error) {
      console.error('Error generating video:', error);
      throw error;
    }
  }

  // Check prediction status
  static async getPrediction(id: string): Promise<ReplicateImageResponse | ReplicateVideoResponse> {
    try {
      const prediction = await replicate.predictions.get(id);
      
      return {
        id: prediction.id,
        status: prediction.status as any,
        output: prediction.output,
        error: prediction.error as string | undefined,
      };
    } catch (error) {
      console.error('Error getting prediction:', error);
      throw error;
    }
  }

  // Cancel a prediction
  static async cancelPrediction(id: string): Promise<void> {
    try {
      await replicate.predictions.cancel(id);
    } catch (error) {
      console.error('Error canceling prediction:', error);
      throw error;
    }
  }

  // Get account usage and limits
  static async getAccountInfo(): Promise<any> {
    try {
      // Note: This endpoint might not be available in the current Replicate API
      // You may need to track usage manually or use webhooks
      return { usage: 'tracking_required', limits: 'check_dashboard' };
    } catch (error) {
      console.error('Error getting account info:', error);
      return null;
    }
  }

  // Validate API connection
  static async validateConnection(): Promise<boolean> {
    try {
      // Try to list models to validate connection
      const models = await replicate.models.list();
      return true;
    } catch (error) {
      console.error('Replicate connection validation failed:', error);
      return false;
    }
  }

  // Get available models (for admin panel)
  static async getAvailableModels(): Promise<any[]> {
    try {
      const models = await replicate.models.list();
      return models.results || [];
    } catch (error) {
      console.error('Error getting available models:', error);
      return [];
    }
  }
}

// Model configurations for different use cases
export const REPLICATE_MODELS = {
  IMAGE: {
    FLUX_CONTEXT: {
      name: "Flux Context",
      version: "dev", // Update with actual version
      description: "High-quality image generation with context awareness"
    },
    FLUX_SCHNELL: {
      name: "Flux Schnell", 
      version: "dev", // Update with actual version
      description: "Fast image generation"
    }
  },
  VIDEO: {
    KLING_1_6: {
      name: "Kling 1.6",
      version: "dev", // Update with actual version
      description: "5-second video generation at 720p"
    }
  }
} as const;

// Rate limiting helper
export class RateLimiter {
  private static requests: number[] = [];
  private static readonly MAX_REQUESTS_PER_MINUTE = 50; // Adjust based on your plan
  
  static async checkRateLimit(): Promise<boolean> {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    
    // Remove requests older than 1 minute
    this.requests = this.requests.filter(time => time > oneMinuteAgo);
    
    return this.requests.length < this.MAX_REQUESTS_PER_MINUTE;
  }
  
  static recordRequest(): void {
    this.requests.push(Date.now());
  }
  
  static getRequestsInLastMinute(): number {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    return this.requests.filter(time => time > oneMinuteAgo).length;
  }
}