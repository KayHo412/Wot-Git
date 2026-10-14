import { runChurn } from './churn'
import { runOwnership } from './ownership'
import { runCoChange } from './cochange'
import { runHotspot } from './hotspot'
import { runCommits } from './commits'
import { runCommitReader } from './commitReader'
import { runOutline } from './outline'
import type { AnalysisResult } from '@wot-git/types'
import { ANALYSIS_MAX_COMMITS } from '../config/limits'

export async function runAnalysis(repoPath: string, repoUrl: string): Promise<AnalysisResult> {
  const [commits, churn] = await Promise.all([
    runCommits(repoPath, ANALYSIS_MAX_COMMITS),
    runChurn(repoPath),
  ])

  const [ownership, cochange, commitReaderResult] = await Promise.all([
    runOwnership(repoPath, churn.map(file => file.path)),
    runCoChange(repoPath),
    runCommitReader(repoPath),
  ])
  const hotspots = await runHotspot(repoPath, churn)
  const outline = await runOutline(repoPath)

  return {
    repoUrl,
    analyzedAt: new Date().toISOString(),
    commits: commits.frequency,
    commitSizes: commits.sizes,
    churn,
    ownership,
    hotspots,
    cochange,
    outline,
    commitLog: commitReaderResult.commitLog,
    bugFiles: commitReaderResult.bugFiles,
  }
}
