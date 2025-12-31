import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type MobileTab = 'chat' | 'files' | 'tools' | 'terminal' | 'settings'

interface MobileNavState {
  activeTab: MobileTab
  previousTab: MobileTab | null
  setActiveTab: (tab: MobileTab) => void
  goBack: () => void
}

export const useMobileNavStore = create<MobileNavState>()(
  persist(
    (set, get) => ({
      activeTab: 'chat',
      previousTab: null,
      
      setActiveTab: (tab) => {
        const current = get().activeTab
        if (current !== tab) {
          set({ activeTab: tab, previousTab: current })
        }
      },
      
      goBack: () => {
        const { previousTab } = get()
        if (previousTab) {
          set({ activeTab: previousTab, previousTab: null })
        }
      },
    }),
    {
      name: 'helm-mobile-nav',
      partialize: (state) => ({ activeTab: state.activeTab }),
    }
  )
)

export const useActiveTab = () => useMobileNavStore((state) => state.activeTab)
export const useSetActiveTab = () => useMobileNavStore((state) => state.setActiveTab)
