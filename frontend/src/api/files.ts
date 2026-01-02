import { useQuery } from '@tanstack/react-query'
import { API_BASE_URL } from '@/config'
import type { FileInfo, ChunkedFileInfo, PatchOperation } from '@/types/files'

async function fetchFile(path: string): Promise<FileInfo> {
  const response = await fetch(`${API_BASE_URL}/api/files/${path}`)
  
  if (!response.ok) {
    throw new Error(`Failed to load file: ${response.statusText}`)
  }
  
  return response.json()
}

async function fetchServerFile(path: string, workdir: string): Promise<FileInfo> {
  const cleanWorkdir = workdir.replace(/\/$/, '')
  const cleanPath = path.startsWith('/') ? path : `/${path}`
  const absolutePath = `${cleanWorkdir}${cleanPath}`
  
  const response = await fetch(`${API_BASE_URL}/api/files${absolutePath}`)
  
  if (!response.ok) {
    throw new Error(`Failed to load file: ${response.statusText}`)
  }
  
  return response.json()
}

export function useFile(path: string | undefined) {
  return useQuery({
    queryKey: ['file', path],
    queryFn: () => path ? fetchFile(path) : Promise.reject(new Error('No file path provided')),
    enabled: !!path,
  })
}

export function useServerFile(path: string | undefined, serverWorkdir: string | undefined) {
  return useQuery({
    queryKey: ['serverFile', serverWorkdir, path],
    queryFn: () => {
      if (!path) return Promise.reject(new Error('No file path provided'))
      if (serverWorkdir) {
        return fetchServerFile(path, serverWorkdir)
      }
      return fetchFile(path)
    },
    enabled: !!path,
  })
}

export async function fetchFileRange(path: string, startLine: number, endLine: number): Promise<ChunkedFileInfo> {
  const response = await fetch(`${API_BASE_URL}/api/files/${path}?startLine=${startLine}&endLine=${endLine}`)
  
  if (!response.ok) {
    throw new Error(`Failed to load file range: ${response.statusText}`)
  }
  
  return response.json()
}

export async function applyFilePatches(path: string, patches: PatchOperation[]): Promise<{ success: boolean; totalLines: number }> {
  const response = await fetch(`${API_BASE_URL}/api/files/${path}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ patches }),
  })
  
  if (!response.ok) {
    throw new Error(`Failed to apply patches: ${response.statusText}`)
  }
  
  return response.json()
}