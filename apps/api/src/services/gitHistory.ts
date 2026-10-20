import type { FileChurn } from '@wot-git/types'
import { ANALYSIS_MAX_COMMITS, ANALYSIS_MAX_FILES, COCHANGE_MAX_FILES_PER_COMMIT } from '../config/limits'
import { isExcludedFile } from '../utils/fileFilter'
import { scanGit, throwIfAborted } from '../utils/scan'

export interface ChangedCommit {
  hash: string
  date: string
  files: string[]
}

export interface GitHistoryResult {
  commits: ChangedCommit[]
  churn: FileChurn[]
  commitsAnalyzed: number
  historyTruncated: boolean
  filesAnalyzed: number
  filesTruncated: boolean
  totalFilesObserved: number
  cochangeTruncated: boolean
}

function parseNameOnlyHistory(raw: string, maxCommits: number): {
  commits: ChangedCommit[]
  churnByPath: Map<string, { churnCount: number; lastTouched: string }>
  historyTruncated: boolean
  filesTruncated: boolean
  cochangeTruncated: boolean
} {
  const records: ChangedCommit[] = []
  const churnByPath = new Map<string, { churnCount: number; lastTouched: string }>()
  let current: ChangedCommit | undefined
  let historyTruncated = false
  let filesTruncated = false
  let cochangeTruncated = false
  let awaitingDate = false

  for (const rawToken of raw.split('\0')) {
    const token = rawToken.startsWith('\n') ? rawToken.slice(1) : rawToken
    const marker = token.match(/^\x1e([a-f0-9]{40})$/)
    if (marker) {
      if (records.length >= maxCommits) {
        historyTruncated = true
        break
      }
      current = { hash: marker[1], date: '', files: [] }
      records.push(current)
      awaitingDate = true
      continue
    }
    if (!current || !token) continue
    if (awaitingDate) {
      current.date = token
      awaitingDate = false
      continue
    }
    if (isExcludedFile(token)) continue
    if (current.files.length < COCHANGE_MAX_FILES_PER_COMMIT) current.files.push(token)
    else cochangeTruncated = true
    const existing = churnByPath.get(token)
    if (existing) existing.churnCount += 1
    else if (churnByPath.size < ANALYSIS_MAX_FILES) churnByPath.set(token, { churnCount: 1, lastTouched: current.date || 'unknown' })
    else filesTruncated = true
  }
  return { commits: records, churnByPath, historyTruncated, filesTruncated, cochangeTruncated }
}

export async function readGitHistory(repoPath: string, maxCommits = ANALYSIS_MAX_COMMITS, signal?: AbortSignal): Promise<GitHistoryResult> {
  const git = scanGit(repoPath, signal)
  const raw = await git.raw(['log', '-z', `-${maxCommits + 1}`, '--format=%x1e%H%x00%ad', '--date=short', '--name-only'])
  const parsed = parseNameOnlyHistory(raw, maxCommits)
  const orderedFiles = [...parsed.churnByPath.entries()].sort((a, b) =>
    b[1].churnCount - a[1].churnCount || a[0].localeCompare(b[0])
  )
  const churn = orderedFiles.map(([path, info]) => ({ path, ...info }))
  throwIfAborted(signal)
  return {
    commits: parsed.commits,
    churn,
    commitsAnalyzed: parsed.commits.length,
    historyTruncated: parsed.historyTruncated,
    filesAnalyzed: churn.length,
    filesTruncated: parsed.filesTruncated,
    totalFilesObserved: parsed.filesTruncated ? ANALYSIS_MAX_FILES + 1 : orderedFiles.length,
    cochangeTruncated: parsed.cochangeTruncated,
  }
}

export async function calculateCoChange(commits: ChangedCommit[], signal?: AbortSignal, limit = 200, maxPairs = 100_000): Promise<{ items: Array<{ fileA: string; fileB: string; count: number }>; truncated: boolean }> {
  const pairCounts = new Map<string, { fileA: string; fileB: string; count: number }>()
  let truncated = false
  for (let commitIndex = 0; commitIndex < commits.length; commitIndex++) {
    const commit = commits[commitIndex]
    if (commitIndex % 128 === 0) {
      throwIfAborted(signal)
      await new Promise<void>(resolve => setImmediate(resolve))
    }
    const files = [...new Set(commit.files)].sort((a, b) => a.localeCompare(b))
    for (let i = 0; i < files.length; i++) {
      for (let j = i + 1; j < files.length; j++) {
        const fileA = files[i]
        const fileB = files[j]
        const key = `${fileA}\0${fileB}`
        const pair = pairCounts.get(key)
        if (pair) pair.count += 1
        else if (pairCounts.size < maxPairs) pairCounts.set(key, { fileA, fileB, count: 1 })
        else truncated = true
      }
    }
  }
  throwIfAborted(signal)
  const items = [...pairCounts.values()]
    .filter(pair => pair.count > 1)
    .sort((a, b) => b.count - a.count || a.fileA.localeCompare(b.fileA) || a.fileB.localeCompare(b.fileB))
    .slice(0, limit)
  return { items, truncated }
}
