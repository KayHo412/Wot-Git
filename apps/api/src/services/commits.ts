import type { CommitFrequency, CommitSize } from '@wot-git/types'
import { scanGit, throwIfAborted } from '../utils/scan'

interface CommitsResult {
  frequency: CommitFrequency[]
  sizes: CommitSize[]
  commitsAnalyzed: number
  historyTruncated: boolean
}

export function parseCommitSizes(logStat: string): CommitSize[] {
  const sizes: CommitSize[] = []
  let current: CommitSize | undefined
  const tokens = logStat.split('\0')
  for (let index = 0; index < tokens.length; index++) {
    const token = tokens[index]
    if (token.startsWith('COMMIT_START\n')) {
      if (current) sizes.push(current)
      const lines = token.split('\n')
      const hash = lines[1]?.trim()
      const date = lines[2]?.trim()
      current = hash && /^[a-f0-9]{40}$/.test(hash) && date
        ? { hash, date, insertions: 0, deletions: 0 }
        : undefined
      continue
    }
    if (!current || !token) continue
    const firstTab = token.indexOf('\t')
    const secondTab = token.indexOf('\t', firstTab + 1)
    if (firstTab < 0 || secondTab < 0) continue
    const insertions = token.slice(0, firstTab) === '-' ? 0 : Number(token.slice(0, firstTab)) || 0
    const deletions = token.slice(firstTab + 1, secondTab) === '-' ? 0 : Number(token.slice(firstTab + 1, secondTab)) || 0
    current.insertions += insertions
    current.deletions += deletions
    if (!token.slice(secondTab + 1)) index += 2 // Rename rows carry old and new paths as separate NUL fields.
  }
  if (current) sizes.push(current)
  return sizes
}

export async function runCommits(repoPath: string, maxCommits: number, signal?: AbortSignal): Promise<CommitsResult> {
  const git = scanGit(repoPath, signal)

  // --- Commit frequency ---
  // Fetch one extra commit so the limit can be checked without loading unbounded history.
  const logFreq = await git.raw(['log', `-${maxCommits + 1}`, '--format=%ad', '--date=short'])
  const dates = logFreq.split('\n').map(d => d.trim()).filter(Boolean)

  const historyTruncated = dates.length > maxCommits
  const analyzedDates = dates.slice(0, maxCommits)

  const frequencyMap: Record<string, number> = {}
  for (const date of analyzedDates) {
    frequencyMap[date] = (frequencyMap[date] || 0) + 1
  }

  const frequency: CommitFrequency[] = Object.entries(frequencyMap)
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date))

  // --- Commit size distribution ---
  const logStat = await git.raw(['log', '-z', `-${maxCommits}`, '--numstat', '--format=COMMIT_START%n%H%n%ad', '--date=short'])
  const sizes = parseCommitSizes(logStat)

  throwIfAborted(signal)
  return { frequency, sizes, commitsAnalyzed: analyzedDates.length, historyTruncated }
}
