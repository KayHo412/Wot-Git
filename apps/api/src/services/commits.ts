import { simpleGit } from 'simple-git'
import type { CommitFrequency, CommitSize } from '@repolens/types'

interface CommitsResult {
  frequency: CommitFrequency[]
  sizes: CommitSize[]
}

export async function runCommits(repoPath: string, maxCommits: number): Promise<CommitsResult> {
  const git = simpleGit(repoPath)

  // --- Commit frequency ---
  const logFreq = await git.raw(['log', '--format=%ad', '--date=short'])
  const dates = logFreq.split('\n').map(d => d.trim()).filter(Boolean)

  if (dates.length > maxCommits) {
    const err = new Error('Repo too large') as any
    err.code = 'REPO_TOO_LARGE'
    throw err
  }

  const frequencyMap: Record<string, number> = {}
  for (const date of dates) {
    frequencyMap[date] = (frequencyMap[date] || 0) + 1
  }

  const frequency: CommitFrequency[] = Object.entries(frequencyMap)
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date))

  // --- Commit size distribution ---
  const logStat = await git.raw(['log', '--stat', '--format=%H|%ad', '--date=short'])
  const sizes: CommitSize[] = []

  const blocks = logStat.split(/\n(?=[a-f0-9]{40}\|)/)
  for (const block of blocks) {
    const lines = block.split('\n')
    const header = lines[0]
    if (!header) continue

    const [hash, date] = header.split('|')
    if (!hash || !date) continue

    let insertions = 0
    let deletions = 0

    // Parse the summary line: "N files changed, X insertions(+), Y deletions(-)"
    const summary = lines.find(l => l.includes('changed'))
    if (summary) {
      const ins = summary.match(/(\d+) insertion/)
      const del = summary.match(/(\d+) deletion/)
      if (ins) insertions = parseInt(ins[1], 10)
      if (del) deletions = parseInt(del[1], 10)
    }

    sizes.push({ hash: hash.trim(), date: date.trim(), insertions, deletions })
  }

  return { frequency, sizes }
}
