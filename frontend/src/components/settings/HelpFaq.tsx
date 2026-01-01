import { useState } from 'react'
import { ChevronDown, ChevronRight, Server, FolderGit2, Terminal, Wrench, Wifi, AlertCircle, ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FaqItem {
  question: string
  answer: React.ReactNode
  id: string
}

interface FaqSection {
  title: string
  icon: React.ElementType
  items: FaqItem[]
}

function FaqAccordion({ item, isOpen, onToggle }: { item: FaqItem; isOpen: boolean; onToggle: () => void }) {
  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-accent/50 transition-colors"
      >
        <span className="font-medium text-foreground pr-4">{item.question}</span>
        {isOpen ? (
          <ChevronDown className="w-5 h-5 text-muted-foreground flex-shrink-0" />
        ) : (
          <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
        )}
      </button>
      {isOpen && (
        <div className="px-4 pb-4 text-sm text-muted-foreground leading-relaxed">
          {item.answer}
        </div>
      )}
    </div>
  )
}

export function HelpFaq() {
  const [openItems, setOpenItems] = useState<Set<string>>(new Set(['mental-model']))

  const toggleItem = (id: string) => {
    setOpenItems(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const sections: FaqSection[] = [
    {
      title: 'How Helm Works',
      icon: Server,
      items: [
        {
          id: 'mental-model',
          question: 'What is Helm and how does it work?',
          answer: (
            <div className="space-y-3">
              <p>
                Helm is a mobile-first web interface for managing multiple OpenCode instances from anywhere.
                It works in <strong>two complementary ways</strong>:
              </p>
              <div className="bg-card border border-border rounded-lg p-3 space-y-2">
                <div className="flex items-start gap-3">
                  <Server className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <strong className="text-foreground">Discovered Servers</strong>
                    <p className="text-xs mt-1">
                      OpenCode instances you start in your project folders are auto-discovered.
                      They run where you started them — your code stays in place.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <FolderGit2 className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <strong className="text-foreground">Workspace Repos</strong>
                    <p className="text-xs mt-1">
                      Repos cloned via the "+ Repository" button live in Helm's workspace folder.
                      Good for quick GitHub browsing without cluttering your home directory.
                    </p>
                  </div>
                </div>
              </div>
              <p className="text-xs">
                <strong>For real work:</strong> Start OpenCode in your actual project folders and use Helm as a remote control.
              </p>
            </div>
          ),
        },
        {
          id: 'where-code-goes',
          question: 'Where does my code live?',
          answer: (
            <div className="space-y-2">
              <p><strong>Discovered servers:</strong> Code stays in the original directory where you ran <code className="bg-accent px-1 rounded">opencode</code>.</p>
              <p><strong>Cloned repos:</strong> Code is stored in <code className="bg-accent px-1 rounded">~/apps/helm/workspace/repos/&lt;repo-name&gt;/</code></p>
              <p className="text-xs mt-2">
                This separation keeps your filesystem clean while still letting you work on external repos through Helm.
              </p>
            </div>
          ),
        },
        {
          id: 'ports',
          question: 'Why are there two different ports?',
          answer: (
            <div className="space-y-2">
              <p>In development mode, Helm runs two servers:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li><strong>Port 5001</strong> — Backend API (always use this for access)</li>
                <li><strong>Port 5173/5174+</strong> — Vite dev server (hot reload)</li>
              </ul>
              <p className="mt-2">
                <strong>Always open port 5001</strong> — it serves the UI and proxies API calls correctly.
                The Vite port is only for development hot-reloading.
              </p>
              <p className="text-xs mt-2">
                In production/Docker, only port 5001 (or 5003) is exposed.
              </p>
            </div>
          ),
        },
      ],
    },
    {
      title: 'Server Discovery',
      icon: Wifi,
      items: [
        {
          id: 'discovery-how',
          question: 'How does server discovery work?',
          answer: (
            <div className="space-y-2">
              <p>
                Helm scans for running OpenCode processes using <code className="bg-accent px-1 rounded">lsof</code> (list open files).
                It finds processes listening on TCP ports and identifies their working directories.
              </p>
              <p className="text-xs">
                Discovery results are cached for 5 seconds. Tap <strong>Refresh</strong> to force a new scan.
              </p>
            </div>
          ),
        },
        {
          id: 'tui-vs-serve',
          question: 'What do "TUI" and "serve" modes mean?',
          answer: (
            <div className="space-y-2">
              <p><strong>TUI (Terminal UI)</strong> — OpenCode is running with an attached terminal. You started it with just <code className="bg-accent px-1 rounded">opencode</code>.</p>
              <p><strong>serve</strong> — OpenCode is running headless (no terminal). You started it with <code className="bg-accent px-1 rounded">opencode serve</code>.</p>
              <p className="text-xs mt-2">
                Both modes work with Helm. TUI mode also shows the terminal view if you have access to the host machine.
              </p>
            </div>
          ),
        },
        {
          id: 'no-servers',
          question: 'Why don\'t I see any servers?',
          answer: (
            <div className="space-y-2">
              <p>Check these common causes:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>OpenCode isn't running — start it with <code className="bg-accent px-1 rounded">opencode</code> in your project folder</li>
                <li>Cache delay — tap Refresh and wait 5 seconds</li>
                <li>Docker isolation — Docker mode can't see host processes</li>
                <li>Permissions — ensure <code className="bg-accent px-1 rounded">lsof</code> can run</li>
              </ul>
            </div>
          ),
        },
        {
          id: 'docker-limitation',
          question: 'Can Docker mode discover my local OpenCode instances?',
          answer: (
            <div className="space-y-2">
              <p>
                <strong>No.</strong> Docker containers are isolated from the host system and cannot see host processes.
              </p>
              <p>
                Docker mode runs its own embedded OpenCode instance. Use it for isolated environments or self-hosted deployments.
              </p>
              <p className="text-xs mt-2">
                For multi-server discovery, run Helm natively: <code className="bg-accent px-1 rounded">pnpm dev</code>
              </p>
            </div>
          ),
        },
      ],
    },
    {
      title: 'Features',
      icon: Wrench,
      items: [
        {
          id: 'terminal',
          question: 'How does the embedded terminal work?',
          answer: (
            <div className="space-y-2">
              <p>
                The terminal tab gives you a full PTY (pseudo-terminal) shell on the Helm server.
                It runs in the selected server's working directory.
              </p>
              <p className="text-xs">
                <strong>Note:</strong> Commands run on the host machine. Be careful with destructive operations.
              </p>
            </div>
          ),
        },
        {
          id: 'mcp-tools',
          question: 'What is the Tools tab?',
          answer: (
            <div className="space-y-2">
              <p>
                The Tools tab shows real-time MCP (Model Context Protocol) tool calls.
                When Claude uses tools like filesystem, GitHub, or custom MCPs, you'll see them here.
              </p>
              <p>Each call shows: tool name, status, duration, and expandable input/output.</p>
            </div>
          ),
        },
        {
          id: 'offline',
          question: 'Does Helm work offline?',
          answer: (
            <div className="space-y-2">
              <p>
                Partially. Helm is a PWA (Progressive Web App) that caches:
              </p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>The UI itself (works offline after first load)</li>
                <li>Recent sessions (viewable offline)</li>
                <li>Pending messages (queued until reconnect)</li>
              </ul>
              <p className="text-xs mt-2">
                AI responses require network connectivity to reach OpenCode servers.
              </p>
            </div>
          ),
        },
      ],
    },
    {
      title: 'Troubleshooting',
      icon: AlertCircle,
      items: [
        {
          id: 'terminal-error',
          question: 'Terminal shows "posix_spawnp failed" on Apple Silicon',
          answer: (
            <div className="space-y-2">
              <p>This is a node-pty compatibility issue. Fix it by rebuilding:</p>
              <pre className="bg-accent p-2 rounded text-xs overflow-x-auto">
{`cd node_modules/.pnpm/node-pty@1.1.0/node_modules/node-pty
npx node-gyp rebuild`}
              </pre>
              <p className="text-xs">Then restart Helm with <code className="bg-accent px-1 rounded">pnpm dev</code></p>
            </div>
          ),
        },
        {
          id: 'server-unhealthy',
          question: 'Server shows "unhealthy" status',
          answer: (
            <div className="space-y-2">
              <p>
                Helm checks server health by calling the OpenCode API.
                "Unhealthy" means the health check failed.
              </p>
              <p>Common causes:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>OpenCode crashed or was stopped</li>
                <li>Port conflict — another process took the port</li>
                <li>Network timeout — slow response</li>
              </ul>
              <p className="text-xs mt-2">
                Try restarting OpenCode in that directory.
              </p>
            </div>
          ),
        },
        {
          id: 'clone-failed',
          question: 'Repository clone failed',
          answer: (
            <div className="space-y-2">
              <p>Helm tries multiple auth methods in order:</p>
              <ol className="list-decimal list-inside space-y-1 ml-2">
                <li>GitHub token (if configured in providers)</li>
                <li>GitHub CLI (<code className="bg-accent px-1 rounded">gh auth</code>)</li>
                <li>Public access (no auth)</li>
              </ol>
              <p className="text-xs mt-2">
                For private repos, ensure you've configured a GitHub token in Settings → Providers,
                or run <code className="bg-accent px-1 rounded">gh auth login</code> on the host.
              </p>
            </div>
          ),
        },
      ],
    },
  ]

  return (
    <div className="space-y-6">
      {/* Quick Start */}
      <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-xl p-4">
        <h3 className="font-semibold text-foreground mb-2 flex items-center gap-2">
          <Terminal className="w-5 h-5 text-blue-500" />
          Quick Start
        </h3>
        <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
          <li>Open <code className="bg-accent px-1 rounded">http://&lt;host&gt;:5001</code></li>
          <li>Start OpenCode in your project: <code className="bg-accent px-1 rounded">cd ~/myproject && opencode</code></li>
          <li>Pick the server in Helm's server picker (top of screen)</li>
          <li>Chat, browse files, or use the terminal</li>
        </ol>
      </div>

      {/* FAQ Sections */}
      {sections.map((section) => (
        <div key={section.title} className="space-y-3">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <section.icon className="w-5 h-5 text-muted-foreground" />
            {section.title}
          </h3>
          <div className="space-y-2">
            {section.items.map((item) => (
              <FaqAccordion
                key={item.id}
                item={item}
                isOpen={openItems.has(item.id)}
                onToggle={() => toggleItem(item.id)}
              />
            ))}
          </div>
        </div>
      ))}

      {/* External Links */}
      <div className="border-t border-border pt-4">
        <h3 className="font-semibold text-foreground mb-3">Resources</h3>
        <div className="space-y-2">
          <a
            href="https://github.com/BioInfo/helm"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            GitHub Repository
          </a>
          <a
            href="https://opencode.ai"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            OpenCode Documentation
          </a>
        </div>
      </div>
    </div>
  )
}
