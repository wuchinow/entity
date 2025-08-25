// This file has been disabled for security reasons.
// All generation queue functionality has been removed.

export class GenerationQueue {
  static async addToQueue(speciesId: number, type: 'image' | 'video'): Promise<void> {
    throw new Error('Generation queue has been disabled for security reasons. All API keys have been removed.');
  }

  static async processQueue(): Promise<void> {
    throw new Error('Generation queue has been disabled for security reasons. All API keys have been removed.');
  }

  static async getQueueStatus(): Promise<{ size: number; processing: boolean }> {
    return { size: 0, processing: false };
  }

  static async clearQueue(): Promise<void> {
    // No-op since queue is disabled
  }

  static async startProcessing(): Promise<void> {
    throw new Error('Generation queue has been disabled for security reasons. All API keys have been removed.');
  }

  static async stopProcessing(): Promise<void> {
    // No-op since queue is disabled
  }
}

export const queueManager = {
  start: () => {
    throw new Error('Generation queue has been disabled for security reasons. All API keys have been removed.');
  },
  stop: () => {
    // No-op since queue is disabled
  },
  getStatus: () => ({ active: false, queueSize: 0 })
};