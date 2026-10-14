import { Router, Request, Response } from 'express'
import NodeCache from 'node-cache'
import type { DashboardResult } from '@wot-git/types'
import { cloneRepo, cleanupRepo } from '../utils/git'
import { runAnalysis } from '../services/analysis'
import { runRepoHealth } from '../services/repoHealth'
import { readRepositoryOverview } from '../services/repositoryOverview'
import { ANALYSIS_MAX_COMMITS, CLONE_TIMEOUT_MS } from '../config/limits'

export const dashboardRouter = Router()

// Use the shorter health lifetime for the combined payload.
const cache = new NodeCache({ stdTTL: 60 * 60 * 6, checkperiod: 60 * 10 })

function isValidGithubUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return parsed.hostname === 'github.com' && parsed.pathname.split('/').filter(Boolean).length >= 2
  } catch {
    return false
  }
}

dashboardRouter.post('/', async (req: Request, res: Response) => {
  const { repoUrl } = req.body ?? {}
  if (typeof repoUrl !== 'string' || !repoUrl.trim()) {
    return res.status(400).json({ error: 'repoUrl is required', code: 'INVALID_URL' })
  }
  if (!isValidGithubUrl(repoUrl)) {
    return res.status(400).json({ error: 'Must be a valid GitHub repository URL', code: 'INVALID_URL' })
  }

  const normalizedUrl = repoUrl.trim().replace(/\.git$/, '').replace(/\/$/, '')
  const cached = cache.get<DashboardResult>(normalizedUrl)
  if (cached) return res.json({ ...cached, fromCache: true })

  let repoPath: string | null = null
  try {
    repoPath = await cloneRepo(normalizedUrl, CLONE_TIMEOUT_MS)
    const [analysis, health, overview] = await Promise.all([
      runAnalysis(repoPath, normalizedUrl),
      runRepoHealth(repoPath, normalizedUrl),
      readRepositoryOverview(repoPath),
    ])
    const result: DashboardResult = { analysis, health, overview }
    cache.set(normalizedUrl, result)
    return res.json(result)
  } catch (err: any) {
    if (err.code === 'REPO_NOT_FOUND') {
      return res.status(404).json({ error: 'Repository not found or is private', code: 'REPO_NOT_FOUND' })
    }
    if (err.code === 'REPO_TOO_LARGE') {
      return res.status(413).json({ error: `Repository exceeds ${ANALYSIS_MAX_COMMITS.toLocaleString()} commits. Try a smaller repo.`, code: 'REPO_TOO_LARGE' })
    }
    if (err.code === 'CLONE_TIMEOUT') {
      return res.status(408).json({ error: 'Clone timed out. The repository may be too large.', code: 'CLONE_TIMEOUT' })
    }
    console.error('Dashboard analysis error:', err)
    return res.status(500).json({ error: 'Internal server error', code: 'INTERNAL_ERROR' })
  } finally {
    if (repoPath) await cleanupRepo(repoPath)
  }
})
