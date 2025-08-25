// This file has been disabled for security reasons.
// All generation functionality has been removed.

export class GenerationService {
  static async processQueue(): Promise<void> {
    throw new Error('Generation service has been disabled for security reasons. All API keys have been removed.');
  }

  static async startProcessing(): Promise<void> {
    throw new Error('Generation service has been disabled for security reasons. All API keys have been removed.');
  }

  static async stopProcessing(): Promise<void> {
    // No-op since service is disabled
  }

  static async getStatus(): Promise<{ active: boolean; queueSize: number }> {
    return { active: false, queueSize: 0 };
  }
}