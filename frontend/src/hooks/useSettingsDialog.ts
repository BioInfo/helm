import { create } from 'zustand'

type SettingsTab = 'general' | 'shortcuts' | 'opencode' | 'providers' | 'help'

interface SettingsDialogStore {
  isOpen: boolean
  defaultTab: SettingsTab | null
  open: () => void
  openToTab: (tab: SettingsTab) => void
  close: () => void
  toggle: () => void
  clearDefaultTab: () => void
}

export const useSettingsDialog = create<SettingsDialogStore>((set) => ({
  isOpen: false,
  defaultTab: null,
  open: () => set({ isOpen: true }),
  openToTab: (tab) => set({ isOpen: true, defaultTab: tab }),
  close: () => set({ isOpen: false }),
  toggle: () => set((state) => ({ isOpen: !state.isOpen })),
  clearDefaultTab: () => set({ defaultTab: null }),
}))
