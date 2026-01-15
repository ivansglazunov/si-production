import { create } from 'zustand'

export const useParallaxStore = create((set) => ({
  isParallaxEnabled: true,
  toggleParallax: () => set((state) => ({ isParallaxEnabled: !state.isParallaxEnabled })),

  isGrainEnabled: true,
  toggleGrain: () => set((state) => ({ isGrainEnabled: !state.isGrainEnabled })),
}))