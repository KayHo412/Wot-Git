import { simpleGit } from 'simple-git'
import { mkdtemp, rm } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'

export async function cloneRepo(repoUrl: string, timeoutMs: number): Promise<string> {
  const repoPath = await mkdtemp(join(tmpdir(), 'wot-git-'))

  const clonePromise = simpleGit().clone(repoUrl, repoPath, ['--no-tags'])

  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => {
      const err = new Error('Clone timed out') as any
      err.code = 'CLONE_TIMEOUT'
      reject(err)
    }, timeoutMs)
  )

  try {
    await Promise.race([clonePromise, timeoutPromise])
  } catch (err: any) {
    // Clean up temp dir if clone failed
    await rm(repoPath, { recursive: true, force: true }).catch(() => {})

    if (err.code === 'CLONE_TIMEOUT') throw err

    // simple-git throws with message containing "not found" or "repository" for 404s
    if (err.message?.toLowerCase().includes('not found') ||
        err.message?.toLowerCase().includes('repository')) {
      const notFound = new Error('Repository not found') as any
      notFound.code = 'REPO_NOT_FOUND'
      throw notFound
    }

    throw err
  }

  return repoPath
}

export async function cleanupRepo(repoPath: string): Promise<void> {
  await rm(repoPath, { recursive: true, force: true }).catch(() => {})
}
