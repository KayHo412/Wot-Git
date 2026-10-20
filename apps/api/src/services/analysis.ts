import { runOwnership } from './ownership'
import { runHotspot } from './hotspot'
import { runCommits } from './commits'
import { runCommitReader } from './commitReader'
import { runOutline } from './outline'
import type { AnalysisResult } from '@wot-git/types'
import { ANALYSIS_MAX_COMMITS, ANALYSIS_MAX_FILES } from '../config/limits'
import { readGitHistory, calculateCoChange } from './gitHistory'
import { throwIfAborted } from '../utils/scan'

export async function runAnalysis(repoPath: string, repoUrl: string, signal?: AbortSignal): Promise<AnalysisResult> {
  const initial = await Promise.allSettled([
    runCommits(repoPath, ANALYSIS_MAX_COMMITS, signal),
    readGitHistory(repoPath, ANALYSIS_MAX_COMMITS, signal),
    runCommitReader(repoPath, ANALYSIS_MAX_COMMITS, signal),
  ])
  const initialFailure = initial.find((result): result is PromiseRejectedResult => result.status === 'rejected')
  if (initialFailure) throw initialFailure.reason
  const commits = (initial[0] as PromiseFulfilledResult<Awaited<ReturnType<typeof runCommits>>>).value
  const history = (initial[1] as PromiseFulfilledResult<Awaited<ReturnType<typeof readGitHistory>>>).value
  const commitReaderResult = (initial[2] as PromiseFulfilledResult<Awaited<ReturnType<typeof runCommitReader>>>).value

  const details = await Promise.allSettled([
    runOwnership(repoPath, history.churn.map(file => file.path), signal),
    runHotspot(repoPath, history.churn, signal),
    runOutline(repoPath, signal),
    calculateCoChange(history.commits, signal),
  ])
  const detailsFailure = details.find((result): result is PromiseRejectedResult => result.status === 'rejected')
  if (detailsFailure) throw detailsFailure.reason
  const ownership = (details[0] as PromiseFulfilledResult<Awaited<ReturnType<typeof runOwnership>>>).value
  const hotspots = (details[1] as PromiseFulfilledResult<Awaited<ReturnType<typeof runHotspot>>>).value
  const outline = (details[2] as PromiseFulfilledResult<Awaited<ReturnType<typeof runOutline>>>).value
  const cochange = (details[3] as PromiseFulfilledResult<Awaited<ReturnType<typeof calculateCoChange>>>).value
  throwIfAborted(signal)
  const historyTruncated = commits.historyTruncated || history.historyTruncated || commitReaderResult.historyTruncated
  const cochangeTruncated = history.cochangeTruncated || cochange.truncated

  return {
    repoUrl,
    analyzedAt: new Date().toISOString(),
    commits: commits.frequency,
    commitSizes: commits.sizes,
    churn: history.churn,
    ownership: ownership.items,
    hotspots: hotspots.items,
    cochange: cochange.items,
    outline: outline.items,
    commitLog: commitReaderResult.commitLog,
    bugFiles: commitReaderResult.bugFiles,
    scan: {
      commitLimit: ANALYSIS_MAX_COMMITS,
      commitsAnalyzed: Math.min(commits.commitsAnalyzed, history.commitsAnalyzed, commitReaderResult.commitsAnalyzed),
      historyTruncated,
      fileLimit: ANALYSIS_MAX_FILES,
      filesAnalyzed: history.filesAnalyzed,
      filesTruncated: history.filesTruncated,
      commitFilesTruncated: commitReaderResult.filesTruncated,
      ownershipTruncated: ownership.truncated,
      cochangeTruncated,
      outlineFileLimit: outline.fileLimit,
      outlineTruncated: outline.truncated,
    },
  }
}
