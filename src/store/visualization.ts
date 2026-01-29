import { create } from 'zustand';

export type OverlayType = 'heatmap' | 'predictions' | 'kills' | 'economy' | 'abilities';

interface VisualizationStore {
  // Overlay visibility toggles
  overlays: {
    heatmap: boolean;
    predictions: boolean;
    kills: boolean;
    economy: boolean;
    abilities: boolean;
  };

  // Heatmap settings
  heatmapSide: 'attack' | 'defense';
  heatmapOpacity: number;
  heatmapRadius: number;

  // Prediction settings
  predictionConfidenceThreshold: number;
  showPredictionPaths: boolean;

  // Kill overlay settings
  showKills: boolean;
  showDeaths: boolean;
  killClusterRadius: number;

  // Timeline settings
  timelineExpanded: boolean;
  selectedTimelineTab: 'economy' | 'abilities' | 'events';

  // Actions
  toggleOverlay: (overlay: OverlayType) => void;
  setOverlay: (overlay: OverlayType, visible: boolean) => void;
  setHeatmapSide: (side: 'attack' | 'defense') => void;
  setHeatmapOpacity: (opacity: number) => void;
  setHeatmapRadius: (radius: number) => void;
  setPredictionThreshold: (threshold: number) => void;
  togglePredictionPaths: () => void;
  setKillClusterRadius: (radius: number) => void;
  toggleTimelineExpanded: () => void;
  setTimelineTab: (tab: 'economy' | 'abilities' | 'events') => void;
  resetOverlays: () => void;
}

const defaultOverlays = {
  heatmap: false,
  predictions: false,
  kills: false,
  economy: false,
  abilities: false,
};

export const useVisualizationStore = create<VisualizationStore>((set) => ({
  // Initial state
  overlays: { ...defaultOverlays },

  heatmapSide: 'attack',
  heatmapOpacity: 0.6,
  heatmapRadius: 30,

  predictionConfidenceThreshold: 0.5,
  showPredictionPaths: true,

  showKills: true,
  showDeaths: true,
  killClusterRadius: 50,

  timelineExpanded: false,
  selectedTimelineTab: 'economy',

  // Actions
  toggleOverlay: (overlay) => {
    set((state) => ({
      overlays: {
        ...state.overlays,
        [overlay]: !state.overlays[overlay],
      },
    }));
  },

  setOverlay: (overlay, visible) => {
    set((state) => ({
      overlays: {
        ...state.overlays,
        [overlay]: visible,
      },
    }));
  },

  setHeatmapSide: (side) => {
    set({ heatmapSide: side });
  },

  setHeatmapOpacity: (opacity) => {
    set({ heatmapOpacity: Math.max(0, Math.min(1, opacity)) });
  },

  setHeatmapRadius: (radius) => {
    set({ heatmapRadius: Math.max(10, Math.min(100, radius)) });
  },

  setPredictionThreshold: (threshold) => {
    set({ predictionConfidenceThreshold: Math.max(0, Math.min(1, threshold)) });
  },

  togglePredictionPaths: () => {
    set((state) => ({ showPredictionPaths: !state.showPredictionPaths }));
  },

  setKillClusterRadius: (radius) => {
    set({ killClusterRadius: Math.max(20, Math.min(100, radius)) });
  },

  toggleTimelineExpanded: () => {
    set((state) => ({ timelineExpanded: !state.timelineExpanded }));
  },

  setTimelineTab: (tab) => {
    set({ selectedTimelineTab: tab });
  },

  resetOverlays: () => {
    set({
      overlays: { ...defaultOverlays },
      heatmapSide: 'attack',
      heatmapOpacity: 0.6,
      predictionConfidenceThreshold: 0.5,
      showPredictionPaths: true,
    });
  },
}));
