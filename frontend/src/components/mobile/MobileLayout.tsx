import { ReactNode } from 'react'
import { useMobile } from '@/hooks/useMobile'
import { BottomNav } from './BottomNav'
import { cn } from '@/lib/utils'

interface MobileLayoutProps {
  children: ReactNode
  hideBottomNav?: boolean
  className?: string
}

export function MobileLayout({ children, hideBottomNav = false, className }: MobileLayoutProps) {
  const isMobile = useMobile()

  if (!isMobile) {
    return <>{children}</>
  }

  return (
    <div className={cn("flex flex-col min-h-screen", className)}>
      <div 
        className="flex-1 overflow-auto"
        style={{ 
          paddingBottom: hideBottomNav ? 'env(safe-area-inset-bottom, 0px)' : 'calc(56px + env(safe-area-inset-bottom, 0px))' 
        }}
      >
        {children}
      </div>
      {!hideBottomNav && <BottomNav />}
    </div>
  )
}

export default MobileLayout
