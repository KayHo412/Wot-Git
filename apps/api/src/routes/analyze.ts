import { Router, Request, Response } from 'express'
import NodeCache from 'node-cache'
import { cloneRepo, cleanupRepo } from '../utils/git'
import type { AnalysisResult } from '@wot-git/types'
import { ANALYSIS_MAX_COMMITS, CLONE_TIMEOUT_MS } from '../config/limits'
import { runAnalysis } from '../services/analysis'

export const analyzeRouter = Router()

// Cache results for 24 hours
const cache = new NodeCache({ stdTTL: 60 * 60 * 24 })

function isValidGithubUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return parsed.hostname === 'github.com' && parsed.pathname.split('/').filter(Boolean).length >= 2
  } catch {
    return false
  }
}

analyzeRouter.post('/', async (req: Request, res: Response) => {
  const { repoUrl } = req.body

  if (!repoUrl || typeof repoUrl !== 'string') {
    return res.status(400).json({ error: 'repoUrl is required', code: 'INVALID_URL' })
  }

  if (!isValidGithubUrl(repoUrl)) {
    return res.status(400).json({ error: 'Must be a valid GitHub repository URL', code: 'INVALID_URL' })
  }

  // Normalize URL (strip trailing slash, .git suffix)
  const normalizedUrl = repoUrl.replace(/\.git$/, '').replace(/\/$/, '')

  // Return cached result if available
  const cached = cache.get<AnalysisResult>(normalizedUrl)
  if (cached) {
    return res.json({ ...cached, fromCache: true })
  }

  let repoPath: string | null = null

  try {
    repoPath = await cloneRepo(normalizedUrl, CLONE_TIMEOUT_MS)

    const result = await runAnalysis(repoPath, normalizedUrl)

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
    console.error('Analysis error:', err)
    return res.status(500).json({ error: 'Internal server error', code: 'INTERNAL_ERROR' })

  } finally {
    if (repoPath) await cleanupRepo(repoPath)
  }
})
