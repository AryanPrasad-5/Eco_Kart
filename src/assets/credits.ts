/**
 * Photography credits for the SmartSort experience.
 * Every image is a real photograph — NASA imagery or free-license stock
 * (Pexels / Unsplash licenses permit commercial use without payment).
 * Credits are displayed on-screen where each photo appears.
 */
export interface PhotoCredit {
  src: string;
  alt: string;
  credit: string;
  sourceUrl: string;
}

export const EARTH_FALLBACK: PhotoCredit = {
  src: '/photos/earth-space.jpg',
  alt: 'Earth seen from orbit, clouds curving across the blue planet',
  credit: 'NASA / Unsplash',
  sourceUrl: 'https://unsplash.com/photos/a-picture-of-the-earth-taken-from-space-nVghQWPCRbI',
};

export const WHALE_PHOTO: PhotoCredit = {
  src: '/photos/whale.jpg',
  alt: 'A humpback whale breaking the ocean surface, half above and half below the waterline',
  credit: 'Photo via Pexels',
  sourceUrl: 'https://www.pexels.com/photo/split-shot-of-whale-4666751/',
};

export const TURTLE_PHOTO: PhotoCredit = {
  src: '/photos/turtle.jpg',
  alt: 'A sea turtle swimming over a vivid coral reef among small fish',
  credit: 'Photo via Pexels',
  sourceUrl: 'https://www.pexels.com/photo/underwater-photography-of-turtle-and-fish-near-coral-reef-4702369/',
};

export const KINGFISHER_PHOTO: PhotoCredit = {
  src: '/photos/kingfisher.jpg',
  alt: 'A white-throated kingfisher perched on a sunlit branch in an Indian forest',
  credit: 'Photo via Pexels',
  sourceUrl: 'https://www.pexels.com/photo/white-bellied-kingfisher-bird-sitting-on-tree-branch-15345430/',
};

/** NASA-derived textures bundled locally (Blue Marble / Black Marble / topography). */
export const TEXTURES = {
  day: '/textures/earth-day.jpg',
  night: '/textures/earth-night.jpg',
  bump: '/textures/earth-bump.png',
} as const;
