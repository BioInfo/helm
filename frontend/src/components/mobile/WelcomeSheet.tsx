import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Compass, Server, Wrench, Terminal, Smartphone } from 'lucide-react'

const STORAGE_KEY = 'helm:onboarding-complete'

interface FeatureItemProps {
  icon: React.ReactNode
  title: string
  description: string
}

function FeatureItem({ icon, title, description }: FeatureItemProps) {
  return (
    <div className="flex gap-3 items-start">
      <div className="shrink-0 w-10 h-10 rounded-full bg-blue-500/10 dark:bg-blue-400/10 flex items-center justify-center text-blue-600 dark:text-blue-400">
        {icon}
      </div>
      <div>
        <h3 className="font-medium text-sm">{title}</h3>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
    </div>
  )
}

export function WelcomeSheet() {
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    const hasCompletedOnboarding = localStorage.getItem(STORAGE_KEY)
    if (hasCompletedOnboarding) return

    const SMOOTH_ENTRANCE_DELAY_MS = 500
    const timer = setTimeout(() => setIsOpen(true), SMOOTH_ENTRANCE_DELAY_MS)
    return () => clearTimeout(timer)
  }, [])

  const handleGetStarted = () => {
    localStorage.setItem(STORAGE_KEY, 'true')
    setIsOpen(false)
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent
        hideCloseButton
        className="sm:max-w-md fixed bottom-0 left-0 right-0 top-auto translate-x-0 translate-y-0 rounded-t-2xl rounded-b-none sm:bottom-auto sm:left-[50%] sm:top-[50%] sm:translate-x-[-50%] sm:translate-y-[-50%] sm:rounded-lg max-h-[85vh] overflow-y-auto"
        style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}
      >
        <DialogHeader className="text-center sm:text-center">
          <div className="mx-auto mb-2 w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <Compass className="w-6 h-6 text-white" />
          </div>
          <DialogTitle className="text-xl">Welcome to Helm</DialogTitle>
          <DialogDescription>
            Your unified command center for OpenCode
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <FeatureItem
            icon={<Server className="w-5 h-5" />}
            title="Multi-Server Discovery"
            description="Automatically finds all running OpenCode instances on your machine"
          />
          <FeatureItem
            icon={<Wrench className="w-5 h-5" />}
            title="MCP Tool Visibility"
            description="See what tools your AI agents are calling in real-time"
          />
          <FeatureItem
            icon={<Terminal className="w-5 h-5" />}
            title="Embedded Terminal"
            description="Full terminal access directly in your browser"
          />
          <FeatureItem
            icon={<Smartphone className="w-5 h-5" />}
            title="Mobile-First Design"
            description="Optimized for iPhone + Tailscale workflows"
          />
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button onClick={handleGetStarted} className="w-full min-h-[44px]">
            Get Started
          </Button>
          <p className="text-xs text-center text-muted-foreground">
            Access help anytime from Settings → Help & FAQ
          </p>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
