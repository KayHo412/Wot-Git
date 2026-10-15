import { Router, Request, Response } from 'express'
import NodeCache from 'node-cache'
import type { AnalysisError, DashboardResult, DashboardStreamMessage } from '@wot-git/types'
import { cloneRepo, cleanupRepo } from '../utils/git'
import { runAnalysis } from '../services/analysis'
import { runRepoHealth } from '../services/repoHealth'
import { readRepositoryOverview } from '../services/repositoryOverview'
import { ANALYSIS_MAX_COMMITS, CLONE_TIMEOUT_MS } from '../config/limits'

export const dashboardRouter = Router()

// Use the shorter health lifetime for the combined payload.
const cache = new NodeCache({ stdTTL: 60 * 60 * 6, checkperiod: 60 * 10 })

type ProgressCallback = (message: DashboardStreamMessage) => void

function isValidGithubUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return parsed.hostname === 'github.com' && parsed.pathname.split('/').filter(Boolean).length >= 2
  } catch {
    return false
  }
}

async function createDashboardResult(normalizedUrl: string, onProgress?: ProgressCallback): Promise<DashboardResult> {
  const cached = cache.get<DashboardResult>(normalizedUrl)
  if (cached) {
    onProgress?.({ type: 'cache' })
    return cached
  }

  let repoPath: string | null = null
  try {
    onProgress?.({ type: 'stage', phase: 'clone', status: 'running' })
    repoPath = await cloneRepo(normalizedUrl, CLONE_TIMEOUT_MS)
    onProgress?.({ type: 'stage', phase: 'clone', status: 'complete' })

    onProgress?.({ type: 'stage', phase: 'analysis', status: 'running' })
    onProgress?.({ type: 'stage', phase: 'health', status: 'running' })
    const analysisPromise = runAnalysis(repoPath, normalizedUrl).then(result => {
      onProgress?.({ type: 'stage', phase: 'analysis', status: 'complete' })
      return result
    })
    const healthPromise = runRepoHealth(repoPath, normalizedUrl).then(result => {
      onProgress?.({ type: 'stage', phase: 'health', status: 'complete' })
      return result
    })
    const outcomes = await Promise.allSettled([analysisPromise, healthPromise])
    const failedOutcome = outcomes.find((outcome): outcome is PromiseRejectedResult => outcome.status === 'rejected')
    if (failedOutcome) throw failedOutcome.reason
    const analysis = (outcomes[0] as PromiseFulfilledResult<Awaited<typeof analysisPromise>>).value
    const health = (outcomes[1] as PromiseFulfilledResult<Awaited<typeof healthPromise>>).value

    onProgress?.({ type: 'stage', phase: 'prepare', status: 'running' })
    const overview = await readRepositoryOverview(repoPath)
    onProgress?.({ type: 'stage', phase: 'prepare', status: 'complete' })
    const result: DashboardResult = { analysis, health, overview }
    cache.set(normalizedUrl, result)
    return result
  } finally {
    if (repoPath) await cleanupRepo(repoPath)
  }
}

function errorDetails(err: any): { status: number; message: string; code: AnalysisError['code'] } {
  if (err?.code === 'REPO_NOT_FOUND') {
    return { status: 404, message: 'Repository not found or is private', code: 'REPO_NOT_FOUND' }
  }
  if (err?.code === 'REPO_TOO_LARGE') {
    return { status: 413, message: `Repository exceeds ${ANALYSIS_MAX_COMMITS.toLocaleString()} commits. Try a smaller repo.`, code: 'REPO_TOO_LARGE' }
  }
  if (err?.code === 'CLONE_TIMEOUT') {
    return { status: 408, message: 'Clone timed out. The repository may be too large.', code: 'CLONE_TIMEOUT' }
  }
  return { status: 500, message: 'Internal server error', code: 'INTERNAL_ERROR' }
}

function writeStreamMessage(res: Response, message: DashboardStreamMessage) {
  if (!res.destroyed && !res.writableEnded) {
    res.write(`data: ${JSON.stringify(message)}\n\n`)
  }
}

function normalizedRepositoryUrl(req: Request, res: Response): string | null {
  const { repoUrl } = req.body ?? {}
  if (typeof repoUrl !== 'string' || !repoUrl.trim()) {
    res.status(400).json({ error: 'repoUrl is required', code: 'INVALID_URL' })
    return null
  }
  if (!isValidGithubUrl(repoUrl)) {
    res.status(400).json({ error: 'Must be a valid GitHub repository URL', code: 'INVALID_URL' })
    return null
  }
  return repoUrl.trim().replace(/\.git$/, '').replace(/\/$/, '')
}

dashboardRouter.post('/', async (req: Request, res: Response) => {
  const normalizedUrl = normalizedRepositoryUrl(req, res)
  if (!normalizedUrl) return
  const cached = cache.get<DashboardResult>(normalizedUrl)
  if (cached) return res.json({ ...cached, fromCache: true })
  try {
    const result = await createDashboardResult(normalizedUrl)
    return res.json(result)
  } catch (err: any) {
    const details = errorDetails(err)
    if (details.status === 500) console.error('Dashboard analysis error:', err)
    return res.status(details.status).json({ error: details.message, code: details.code })
  }
})

dashboardRouter.post('/stream', async (req: Request, res: Response) => {
  const normalizedUrl = normalizedRepositoryUrl(req, res)
  if (!normalizedUrl) return

  res.status(200)
  res.set({
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  })
  res.flushHeaders()
  const heartbeat = setInterval(() => {
    if (!res.destroyed && !res.writableEnded) res.write(': keep-alive\n\n')
  }, 15_000)

  try {
    const result = await createDashboardResult(normalizedUrl, message => writeStreamMessage(res, message))
    writeStreamMessage(res, { type: 'complete', result })
  } catch (err: any) {
    const details = errorDetails(err)
    if (details.status === 500) console.error('Dashboard analysis stream error:', err)
    writeStreamMessage(res, { type: 'error', error: details.message, code: details.code })
  } finally {
    clearInterval(heartbeat)
    if (!res.destroyed && !res.writableEnded) res.end()
  }
})
