import { create } from 'zustand';

interface VisualizationStore {
  // Timeline settings
  timelineExpanded: boolean;
  selectedTimelineTab: 'events';

  // Actions
  toggleTimelineExpanded: () => void;
  setTimelineTab: (tab: 'events') => void;
}

export const useVisualizationStore = create<VisualizationStore>((set) => ({
  timelineExpanded: false,
  selectedTimelineTab: 'events',

  toggleTimelineExpanded: () => {
    set((state) => ({ timelineExpanded: !state.timelineExpanded }));
  },

  setTimelineTab: (tab) => {
    set({ selectedTimelineTab: tab });
  },
}));
