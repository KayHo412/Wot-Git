import { simpleGit } from 'simple-git'
import { SCAN_TIMEOUT_MS } from '../config/limits'

export interface ScanContext {
  signal: AbortSignal
  deadlineAt: number
  dispose: () => void
}

export function createScanContext(parentSignal?: AbortSignal): ScanContext {
  const controller = new AbortController()
  const deadlineAt = Date.now() + SCAN_TIMEOUT_MS
  const timer = setTimeout(() => {
    const error = new Error('Repository scan exceeded its time limit') as NodeJS.ErrnoException
    error.code = 'SCAN_TIMEOUT'
    controller.abort(error)
  }, SCAN_TIMEOUT_MS)
  const onParentAbort = () => controller.abort(parentSignal?.reason)
  if (parentSignal?.aborted) onParentAbort()
  else parentSignal?.addEventListener('abort', onParentAbort, { once: true })

  return {
    signal: controller.signal,
    deadlineAt,
    dispose: () => {
      clearTimeout(timer)
      parentSignal?.removeEventListener('abort', onParentAbort)
    },
  }
}

export function abortError(signal?: AbortSignal): Error | null {
  if (!signal?.aborted) return null
  const reason = signal.reason as NodeJS.ErrnoException | undefined
  if (reason?.code === 'SCAN_TIMEOUT') return reason
  const error = new Error('Repository scan was cancelled') as NodeJS.ErrnoException
  error.code = 'SCAN_ABORTED'
  return error
}

export function throwIfAborted(signal?: AbortSignal): void {
  const error = abortError(signal)
  if (error) throw error
}

export function scanGit(repoPath: string, signal?: AbortSignal) {
  const remaining = Math.max(1_000, signal ? SCAN_TIMEOUT_MS : 60_000)
  return simpleGit(repoPath, {
    ...(signal ? { abort: signal } : {}),
    timeout: { block: remaining },
    maxConcurrentProcesses: 8,
  })
}
