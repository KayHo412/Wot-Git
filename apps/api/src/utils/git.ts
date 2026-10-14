import { spawn } from 'child_process'
import { mkdtemp, rm } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'

export async function cloneRepo(repoUrl: string, timeoutMs: number): Promise<string> {
  const repoPath = await mkdtemp(join(tmpdir(), 'wot-git-'))
  try {
    await new Promise<void>((resolve, reject) => {
      const child = spawn('git', ['clone', '--no-tags', repoUrl, repoPath], { stdio: ['ignore', 'ignore', 'pipe'] })
      let stderr = ''
      let timedOut = false
      let forceKillTimer: NodeJS.Timeout | undefined
      const timeout = setTimeout(() => {
        timedOut = true
        child.kill('SIGTERM')
        forceKillTimer = setTimeout(() => child.kill('SIGKILL'), 2_000)
      }, timeoutMs)

      child.stderr.setEncoding('utf8')
      child.stderr.on('data', (chunk: string) => {
        // Git diagnostics are only used to map failures; keep memory bounded.
        stderr = (stderr + chunk).slice(-4_096)
      })
      child.once('error', error => {
        clearTimeout(timeout)
        if (forceKillTimer) clearTimeout(forceKillTimer)
        reject(error)
      })
      child.once('close', code => {
        clearTimeout(timeout)
        if (forceKillTimer) clearTimeout(forceKillTimer)
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
    return repoPath
  } catch (error) {
    await rm(repoPath, { recursive: true, force: true }).catch(() => {})
    throw error
  }
}

export async function cleanupRepo(repoPath: string): Promise<void> {
  await rm(repoPath, { recursive: true, force: true }).catch(() => {})
}
