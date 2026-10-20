import { spawn } from 'child_process'
import { mkdtemp, readdir, rm, stat } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import { ANALYSIS_MAX_COMMITS, REPOSITORY_MAX_BYTES } from '../config/limits'
import { abortError } from './scan'

async function directoryBytes(root: string): Promise<number> {
  let total = 0
  const pending = [root]
  while (pending.length && total <= REPOSITORY_MAX_BYTES) {
    const directory = pending.pop()!
    let entries
    try {
      entries = await readdir(directory, { withFileTypes: true })
    } catch {
      continue
    }
    for (const entry of entries) {
      const path = join(directory, entry.name)
      if (entry.isDirectory()) pending.push(path)
      else if (entry.isFile()) {
        try { total += (await stat(path)).size } catch { /* clone may be moving the file */ }
        if (total > REPOSITORY_MAX_BYTES) return total
      }
    }
  }
  return total
}

export async function cloneRepo(repoUrl: string, timeoutMs: number, signal?: AbortSignal): Promise<string> {
  const repoPath = await mkdtemp(join(tmpdir(), 'wot-git-'))
  try {
    await new Promise<void>((resolve, reject) => {
      const child = spawn('git', ['clone', '--no-tags', `--depth=${ANALYSIS_MAX_COMMITS + 1}`, repoUrl, repoPath], { stdio: ['ignore', 'ignore', 'pipe'] })
      let stderr = ''
      let timedOut = false
      let sizeLimited = false
      let forceKillTimer: NodeJS.Timeout | undefined
      let sizeCheckTimer: NodeJS.Timeout | undefined
      let checkingSize = false
      const kill = () => {
        child.kill('SIGTERM')
        forceKillTimer = setTimeout(() => child.kill('SIGKILL'), 2_000)
      }
      const onAbort = () => kill()
      if (signal?.aborted) {
        kill()
      } else {
        signal?.addEventListener('abort', onAbort, { once: true })
      }
      const timeout = setTimeout(() => {
        timedOut = true
        kill()
      }, timeoutMs)

      const checkSize = async () => {
        if (checkingSize || child.killed) return
        checkingSize = true
        try {
          if (await directoryBytes(repoPath) > REPOSITORY_MAX_BYTES) {
            sizeLimited = true
            kill()
          }
        } finally {
          checkingSize = false
        }
      }
      sizeCheckTimer = setInterval(() => { void checkSize() }, 1_000)

      child.stderr.setEncoding('utf8')
      child.stderr.on('data', (chunk: string) => {
        // Git diagnostics are only used to map failures; keep memory bounded.
        stderr = (stderr + chunk).slice(-4_096)
      })
      child.once('error', error => {
        clearTimeout(timeout)
        if (sizeCheckTimer) clearInterval(sizeCheckTimer)
        if (forceKillTimer) clearTimeout(forceKillTimer)
        signal?.removeEventListener('abort', onAbort)
        reject(error)
      })
      child.once('close', code => {
        clearTimeout(timeout)
        if (sizeCheckTimer) clearInterval(sizeCheckTimer)
        if (forceKillTimer) clearTimeout(forceKillTimer)
        signal?.removeEventListener('abort', onAbort)
        const aborted = abortError(signal)
        if (aborted) {
          reject(aborted)
          return
        }
        if (sizeLimited) {
          const error = new Error(`Repository checkout exceeds ${Math.floor(REPOSITORY_MAX_BYTES / (1024 ** 3))} GiB`) as NodeJS.ErrnoException
          error.code = 'REPO_SIZE_LIMIT'
          reject(error)
          return
        }
        if (timedOut) {
          const error = new Error('Clone timed out') as NodeJS.ErrnoException
          error.code = 'CLONE_TIMEOUT'
          reject(error)
          return
        }
        if (code === 0) {
          resolve()
          return
        }
        if (/not found|repository/i.test(stderr)) {
          const error = new Error('Repository not found') as NodeJS.ErrnoException
          error.code = 'REPO_NOT_FOUND'
          reject(error)
          return
        }
        reject(new Error(stderr.trim() || `git clone exited with status ${code}`))
      })
    })
    if (await directoryBytes(repoPath) > REPOSITORY_MAX_BYTES) {
      const error = new Error('Repository checkout exceeds the configured size limit') as NodeJS.ErrnoException
      error.code = 'REPO_SIZE_LIMIT'
      throw error
    }
    return repoPath
  } catch (error) {
    await rm(repoPath, { recursive: true, force: true }).catch(() => {})
    throw error
  }
}

export async function cleanupRepo(repoPath: string): Promise<void> {
  await rm(repoPath, { recursive: true, force: true }).catch(() => {})
}
