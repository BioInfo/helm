import { MessageSquare, FolderOpen, Wrench, Terminal, Settings } from 'lucide-react'
import { useActiveTab, useSetActiveTab, type MobileTab } from '@/stores/mobileNavStore'
import { useActiveToolCallCount } from '@/stores/mcpStore'
import { cn } from '@/lib/utils'

interface TabConfig {
  id: MobileTab
  icon: typeof MessageSquare
  label: string
}

const tabs: TabConfig[] = [
  { id: 'chat', icon: MessageSquare, label: 'Chat' },
  { id: 'files', icon: FolderOpen, label: 'Files' },
  { id: 'tools', icon: Wrench, label: 'Tools' },
  { id: 'terminal', icon: Terminal, label: 'Terminal' },
  { id: 'settings', icon: Settings, label: 'Settings' },
]

interface BottomNavProps {
  className?: string
}

export function BottomNav({ className }: BottomNavProps) {
  const activeTab = useActiveTab()
  const setActiveTab = useSetActiveTab()
  const activeToolCalls = useActiveToolCallCount()

  const handleTabClick = (tab: MobileTab) => {
    setActiveTab(tab)
    if ('vibrate' in navigator) {
      navigator.vibrate(10)
    }
  }

  return (
    <nav 
      className={cn(
        "fixed bottom-0 left-0 right-0 bg-background border-t border-border z-50 md:hidden",
        className
      )}
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="flex justify-around items-center">
        {tabs.map(({ id, icon: Icon, label }) => {
          const isActive = activeTab === id
          const showBadge = id === 'tools' && activeToolCalls > 0
          
          return (
            <button
              key={id}
              onClick={() => handleTabClick(id)}
              className={cn(
                "flex flex-col items-center justify-center py-2 px-3 min-w-[56px] min-h-[48px]",
                "transition-colors touch-manipulation",
                isActive 
                  ? "text-primary" 
                  : "text-muted-foreground active:text-foreground"
              )}
              aria-label={label}
              aria-current={isActive ? 'page' : undefined}
            >
              <div className="relative">
                <Icon 
                  size={22} 
                  strokeWidth={isActive ? 2.5 : 2} 
                  className="transition-all"
                />
                {showBadge && (
                  <span className="absolute -top-1 -right-2 flex h-4 min-w-4 items-center justify-center">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-4 min-w-4 px-1 bg-yellow-500 text-white text-[10px] font-bold items-center justify-center">
                      {activeToolCalls > 9 ? '9+' : activeToolCalls}
                    </span>
                  </span>
                )}
              </div>
              <span 
                className={cn(
                  "text-[10px] mt-0.5 font-medium transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}
              >
                {label}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}

export default BottomNav
