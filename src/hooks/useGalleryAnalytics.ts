import { track } from '@vercel/analytics';

export const useGalleryAnalytics = () => {
  const trackSpeciesView = (speciesName: string, speciesId: string) => {
    track('species_viewed', {
      species_name: speciesName,
      species_id: speciesId,
    });
  };

  const trackMediaInteraction = (
    speciesName: string,
    mediaType: 'image' | 'video',
    action: 'view' | 'play' | 'pause'
  ) => {
    track('media_interaction', {
      species_name: speciesName,
      media_type: mediaType,
      action: action,
    });
  };

  const trackGalleryNavigation = (
    action: 'next' | 'previous' | 'random' | 'species_select'
  ) => {
    track('gallery_navigation', {
      action: action,
    });
  };

  const trackExhibitionMode = (action: 'enter' | 'exit') => {
    track('exhibition_mode', {
      action: action,
    });
  };

  const trackMediaTypeSwitch = (
    speciesName: string,
    fromType: 'image' | 'video',
    toType: 'image' | 'video'
  ) => {
    track('media_type_switch', {
      species_name: speciesName,
      from_type: fromType,
      to_type: toType,
    });
  };

  return {
    trackSpeciesView,
    trackMediaInteraction,
    trackGalleryNavigation,
    trackExhibitionMode,
    trackMediaTypeSwitch,
  };
};