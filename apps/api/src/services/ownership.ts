import type { FileOwnership } from '@wot-git/types'
import { ANALYSIS_MAX_COMMITS } from '../config/limits'
import { scanGit, throwIfAborted } from '../utils/scan'

const MAX_AUTHORS_PER_FILE = 100

export async function runOwnership(repoPath: string, filePaths: string[], signal?: AbortSignal): Promise<{ items: FileOwnership[]; truncated: boolean }> {
  const selectedPaths = new Set(filePaths)
  const authorCounts = new Map<string, Map<string, number>>()
  let currentEmail = ''
  let readingEmail = false
  let truncated = false
  const git = scanGit(repoPath, signal)
  const raw = await git.raw(['log', '-z', `-${ANALYSIS_MAX_COMMITS}`, '--format=%x1e%H%x00%ae', '--name-only'])

  for (const rawToken of raw.split('\0')) {
    const token = rawToken.startsWith('\n') ? rawToken.slice(1) : rawToken
    const marker = token.match(/^\x1e[a-f0-9]{40}$/)
    if (marker) {
      readingEmail = true
      currentEmail = ''
      continue
    }
    if (readingEmail) {
      currentEmail = token
      readingEmail = false
      continue
    }
    if (!token || !selectedPaths.has(token) || !currentEmail) continue
    let counts = authorCounts.get(token)
    if (!counts) authorCounts.set(token, counts = new Map())
    if (counts.has(currentEmail)) counts.set(currentEmail, counts.get(currentEmail)! + 1)
    else if (counts.size < MAX_AUTHORS_PER_FILE) counts.set(currentEmail, 1)
    else truncated = true
  }
  throwIfAborted(signal)

  const items = filePaths.map(path => {
    const counts = authorCounts.get(path) ?? new Map<string, number>()
    const authors = [...counts.keys()].sort((a, b) => a.localeCompare(b))
    const dominantAuthor = authors.reduce((dominant, author) =>
      !dominant || counts.get(author)! > counts.get(dominant)! ? author : dominant, '')
    return {
      path,
      authors,
      dominantAuthor: dominantAuthor || 'unknown',
      isBusFactor: authors.length === 1,
    }
  })
  return { items, truncated }
}
