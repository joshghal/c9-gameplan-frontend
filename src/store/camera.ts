import { create } from 'zustand';

interface CameraState {
  // Camera transform
  x: number;
  y: number;
  zoom: number;

  // Theater mode
  isTheaterMode: boolean;
  isAnimating: boolean;

  // Highlight
  highlightedPlayers: string[];
  focusLabel: string;

  // Actions
  panTo: (x: number, y: number, zoom?: number) => void;
  resetCamera: () => void;
  setTheaterMode: (on: boolean) => void;
  setHighlightedPlayers: (ids: string[]) => void;
  clearHighlights: () => void;
  setFocusLabel: (label: string) => void;
  setIsAnimating: (v: boolean) => void;
}

export const useCameraStore = create<CameraState>((set) => ({
  x: 0.5,
  y: 0.5,
  zoom: 1,
  isTheaterMode: false,
  isAnimating: false,
  highlightedPlayers: [],
  focusLabel: '',

  panTo: (x, y, zoom) => set({ x, y, zoom: zoom ?? 1 }),
  resetCamera: () => set({ x: 0.5, y: 0.5, zoom: 1, highlightedPlayers: [], focusLabel: '', isAnimating: false }),
  setTheaterMode: (on) => set({ isTheaterMode: on }),
  setHighlightedPlayers: (ids) => set({ highlightedPlayers: ids }),
  clearHighlights: () => set({ highlightedPlayers: [], focusLabel: '' }),
  setFocusLabel: (label) => set({ focusLabel: label }),
  setIsAnimating: (v) => set({ isAnimating: v }),
}));
