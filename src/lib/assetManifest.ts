/**
 * Asset Manifest — all assets to preload on app initialization.
 */

export type AssetType = 'image';

export interface Asset {
  url: string;
  type: AssetType;
  priority: 'critical' | 'high' | 'normal';
}

// Critical — needed immediately for idle stage first frame
const criticalAssets: Asset[] = [
  { url: '/maps/wallpapers/ascent.png', type: 'image', priority: 'critical' },
];

// High — wallpapers rotate every 6s in idle stage, all needed soon
const highPriorityAssets: Asset[] = [
  { url: '/maps/wallpapers/bind.png', type: 'image', priority: 'high' },
  { url: '/maps/wallpapers/breeze.png', type: 'image', priority: 'high' },
  { url: '/maps/wallpapers/fracture.png', type: 'image', priority: 'high' },
  { url: '/maps/wallpapers/haven.png', type: 'image', priority: 'high' },
  { url: '/maps/wallpapers/icebox.png', type: 'image', priority: 'high' },
  { url: '/maps/wallpapers/lotus.png', type: 'image', priority: 'high' },
  { url: '/maps/wallpapers/pearl.png', type: 'image', priority: 'high' },
  { url: '/maps/wallpapers/split.png', type: 'image', priority: 'high' },
  { url: '/maps/wallpapers/sunset.png', type: 'image', priority: 'high' },
  { url: '/maps/wallpapers/abyss.png', type: 'image', priority: 'high' },
  { url: '/maps/wallpapers/corrode.png', type: 'image', priority: 'high' },
];

// Normal — map layers only needed when simulation starts
const normalPriorityAssets: Asset[] = [
  { url: '/maps/ascent.png', type: 'image', priority: 'normal' },
  { url: '/maps/bind.png', type: 'image', priority: 'normal' },
  { url: '/maps/breeze.png', type: 'image', priority: 'normal' },
  { url: '/maps/fracture.png', type: 'image', priority: 'normal' },
  { url: '/maps/haven.png', type: 'image', priority: 'normal' },
  { url: '/maps/icebox.png', type: 'image', priority: 'normal' },
  { url: '/maps/lotus.png', type: 'image', priority: 'normal' },
  { url: '/maps/pearl.png', type: 'image', priority: 'normal' },
  { url: '/maps/split.png', type: 'image', priority: 'normal' },
  { url: '/maps/sunset.png', type: 'image', priority: 'normal' },
  { url: '/maps/abyss.png', type: 'image', priority: 'normal' },
  { url: '/maps/corrode.png', type: 'image', priority: 'normal' },
];

export const assetManifest: Asset[] = [
  ...criticalAssets,
  ...highPriorityAssets,
  ...normalPriorityAssets,
];
