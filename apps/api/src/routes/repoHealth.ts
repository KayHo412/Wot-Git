import { Router, Request, Response } from 'express'
import NodeCache from 'node-cache'
import type { RepoHealthResult } from '@wot-git/types'
import { cloneRepo, cleanupRepo } from '../utils/git'
import { runRepoHealth } from '../services/repoHealth'
import { CLONE_TIMEOUT_MS } from '../config/limits'
import { abortError, createScanContext } from '../utils/scan'

export const repoHealthRouter = Router()

const cache = new NodeCache({ stdTTL: 60 * 60 * 6, checkperiod: 60 * 10 })
function isValidGithubUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return parsed.hostname === 'github.com' && parsed.pathname.split('/').filter(Boolean).length >= 2
  } catch {
    return false
  }
}

repoHealthRouter.post('/', async (req: Request, res: Response) => {
  const { repoUrl } = req.body ?? {}
  if (typeof repoUrl !== 'string' || !repoUrl.trim()) {
    return res.status(400).json({ error: 'repoUrl is required', code: 'INVALID_URL' })
  }
  if (!isValidGithubUrl(repoUrl)) {
    return res.status(400).json({ error: 'Must be a valid GitHub repository URL', code: 'INVALID_URL' })
  }

  const normalizedUrl = repoUrl.trim().replace(/\.git$/, '').replace(/\/$/, '')
  const forceRefresh = req.body?.refresh === true || req.query.refresh === 'true'
  const cached = cache.get<RepoHealthResult>(normalizedUrl)
  if (cached && !forceRefresh) return res.json({ ...cached, fromCache: true })

  let repoPath: string | null = null
  const requestController = new AbortController()
  const abortRequest = () => requestController.abort(new Error('Client disconnected'))
  if (req.aborted) abortRequest()
  req.once('aborted', abortRequest)
  const onClose = () => { if (!res.writableEnded) abortRequest() }
  res.once('close', onClose)
  const scan = createScanContext(requestController.signal)
  try {
    repoPath = await cloneRepo(normalizedUrl, CLONE_TIMEOUT_MS, scan.signal)
    const result = await runRepoHealth(repoPath, normalizedUrl, scan.signal)
    cache.set(normalizedUrl, result)
    return res.json(result)
  } catch (err: any) {
    err = abortError(scan.signal) ?? err
    if (res.destroyed) return
    if (err.code === 'REPO_NOT_FOUND') {
      return res.status(404).json({ error: 'Repository not found or is private', code: 'REPO_NOT_FOUND' })
    }
    if (err.code === 'CLONE_TIMEOUT') {
      return res.status(408).json({ error: 'Clone timed out. The repository may be too large.', code: 'CLONE_TIMEOUT' })
    }
    if (err.code === 'SCAN_TIMEOUT') {
      return res.status(408).json({ error: 'Repository analysis exceeded the 3 minute scan limit. Try a smaller repository.', code: 'SCAN_TIMEOUT' })
    }
    if (err.code === 'REPO_SIZE_LIMIT') {
      return res.status(413).json({ error: 'Repository checkout exceeds the 1 GiB scan limit.', code: 'REPO_SIZE_LIMIT' })
    }
    if (err.code === 'SCAN_ABORTED') return
    console.error('Repository health analysis error:', err)
    return res.status(500).json({ error: 'Internal server error', code: 'INTERNAL_ERROR' })
  } finally {
    scan.dispose()
    req.off('aborted', abortRequest)
    res.off('close', onClose)
    if (repoPath) await cleanupRepo(repoPath)
  }
})
