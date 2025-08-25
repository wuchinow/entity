// This file has been disabled for security reasons.
// All Replicate API functionality has been removed.
// Image and video generation features are no longer available.

export const ReplicateService = {
  generateImage: () => {
    throw new Error('Image generation has been disabled for security reasons');
  },
  generateVideo: () => {
    throw new Error('Video generation has been disabled for security reasons');
  },
  getPrediction: () => {
    throw new Error('Replicate API access has been disabled for security reasons');
  },
  cancelPrediction: () => {
    throw new Error('Replicate API access has been disabled for security reasons');
  },
  validateConnection: () => {
    return Promise.resolve(false);
  },
  listModels: () => {
    return Promise.resolve([]);
  }
};

export const RateLimiter = {
  canMakeRequest: () => false,
  recordRequest: () => {},
  getStatus: () => ({ canMakeRequest: false, nextAvailableTime: null })
};

export const REPLICATE_MODELS = {
  IMAGE: {},
  VIDEO: {}
};