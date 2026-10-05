/**
 * Ad Components Barrel Export
 * 
 * All Adsterra ad components in one place.
 * 
 * @example
 * import { AdBanner, NativeAd, PopunderAd } from '@/components/ads';
 */

// Main Ad Components
export { AdBanner } from './AdBanner';
export { NativeAd } from './NativeAd';
export { PopunderAd, usePopunderTrigger } from './PopunderAd';
export { SocialBarAd, removeSocialBar } from './SocialBarAd';

// Utility Components
export { AdPlaceholder, getAdContainerStyles, getAdContainerClasses } from './AdPlaceholder';
export { AdErrorBoundary, withAdErrorBoundary } from './AdErrorBoundary';

// Types
export type { AdSize } from './AdPlaceholder';
