import { useState, useEffect } from 'react'
import { Server, Plus, Trash2, Loader2, CheckCircle, XCircle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { showToast } from '@/lib/toast'
import { remoteServersApi, type RemoteServer } from '@/api/remote-servers'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

export function RemoteServersSettings() {
  const [servers, setServers] = useState<RemoteServer[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [testingId, setTestingId] = useState<number | null>(null)
  const [testResults, setTestResults] = useState<Record<number, 'healthy' | 'unhealthy'>>({})

  const loadServers = async () => {
    try {
      const data = await remoteServersApi.list()
      setServers(data)
    } catch {
      showToast.error('Failed to load remote servers')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadServers()
  }, [])

  const handleTest = async (id: number) => {
    setTestingId(id)
    try {
      const result = await remoteServersApi.test(id)
      setTestResults((prev) => ({ ...prev, [id]: result.status }))
      if (result.status === 'healthy') {
        showToast.success(result.message)
      } else {
        showToast.error(result.message)
      }
    } catch {
      setTestResults((prev) => ({ ...prev, [id]: 'unhealthy' }))
      showToast.error('Connection test failed')
    } finally {
      setTestingId(null)
    }
  }

  const handleToggle = async (server: RemoteServer) => {
    try {
      const updated = await remoteServersApi.update(server.id, { enabled: !server.enabled })
      setServers((prev) => prev.map((s) => (s.id === server.id ? updated : s)))
      showToast.success(`Server ${updated.enabled ? 'enabled' : 'disabled'}`)
    } catch {
      showToast.error('Failed to update server')
    }
  }

  const handleDelete = async (server: RemoteServer) => {
    if (!confirm(`Delete remote server "${server.name}"?`)) return

    try {
      await remoteServersApi.delete(server.id)
      setServers((prev) => prev.filter((s) => s.id !== server.id))
      showToast.success('Server deleted')
    } catch {
      showToast.error('Failed to delete server')
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Remote Servers</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Add OpenCode instances running on other machines
          </p>
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Add Server
        </Button>
      </div>

      {servers.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Server className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No remote servers configured</p>
          <p className="text-sm mt-1">
            Add remote machines running OpenCode to manage them from here
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {servers.map((server) => (
            <div
              key={server.id}
              className="flex items-center justify-between p-4 rounded-lg border border-border bg-background"
            >
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-muted">
                  <Server className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <div className="font-medium text-foreground">{server.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {server.host}:{server.port}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {testResults[server.id] && (
                  <div className="flex items-center gap-1">
                    {testResults[server.id] === 'healthy' ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                  </div>
                )}

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleTest(server.id)}
                  disabled={testingId === server.id}
                >
                  {testingId === server.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                </Button>

                <Switch
                  checked={server.enabled}
                  onCheckedChange={() => handleToggle(server)}
                />

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(server)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <AddServerDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onSuccess={(server) => {
          setServers((prev) => [...prev, server])
          setIsAddDialogOpen(false)
        }}
      />
    </div>
  )
}

function AddServerDialog({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: (server: RemoteServer) => void
}) {
  const [name, setName] = useState('')
  const [host, setHost] = useState('')
  const [port, setPort] = useState('60828')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim() || !host.trim()) {
      showToast.error('Name and host are required')
      return
    }

    const portNum = parseInt(port, 10)
    if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
      showToast.error('Invalid port number')
      return
    }

    setIsSubmitting(true)
    try {
      const server = await remoteServersApi.create({
        name: name.trim(),
        host: host.trim(),
        port: portNum,
      })
      showToast.success('Server added')
      onSuccess(server)
      setName('')
      setHost('')
      setPort('60828')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to add server'
      showToast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Remote Server</DialogTitle>
          <DialogDescription>
            Add an OpenCode instance running on another machine
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Display Name</Label>
            <Input
              id="name"
              placeholder="e.g., DGX Spark, Raspberry Pi"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="host">Host</Label>
            <Input
              id="host"
              placeholder="e.g., 192.168.1.100 or dgx.tailnet"
              value={host}
              onChange={(e) => setHost(e.target.value)}
              disabled={isSubmitting}
            />
            <p className="text-xs text-muted-foreground">
              IP address or hostname (Tailscale hostname works too)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="port">Port</Label>
            <Input
              id="port"
              type="number"
              placeholder="60828"
              value={port}
              onChange={(e) => setPort(e.target.value)}
              disabled={isSubmitting}
            />
            <p className="text-xs text-muted-foreground">
              Default OpenCode port is 60828
            </p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Add Server
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
