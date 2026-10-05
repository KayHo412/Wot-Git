import { simpleGit } from 'simple-git'
import type { FileChurn } from '@wot-git/types'
import { isExcludedFile } from '../utils/fileFilter'

export async function runChurn(repoPath: string): Promise<FileChurn[]> {
  const git = simpleGit(repoPath)

  // Get all files touched per commit
  const log = await git.raw(['log', '--name-only', '--format=', '--', '.'])
  const lines = log.split('\n').map(l => l.trim()).filter(Boolean)

  // Count how many commits touched each file
  const churnMap: Record<string, number> = {}
  for (const line of lines) {
    churnMap[line] = (churnMap[line] || 0) + 1
  }

  // Filter out non-source files before querying lastTouched
  const files = Object.keys(churnMap).filter(path => !isExcludedFile(path))
  const results: FileChurn[] = []

  // Run lastTouched in batches to avoid spawning too many processes
  const BATCH = 50
  for (let i = 0; i < files.length; i += BATCH) {
    const batch = files.slice(i, i + BATCH)
    const lastTouched = await Promise.all(
      batch.map(async (path) => {
        try {
          const date = await git.raw(['log', '-1', '--format=%ad', '--date=short', '--', path])
          return date.trim() || 'unknown'
        } catch {
          return 'unknown'
        }
      })
    )
    for (let j = 0; j < batch.length; j++) {
      results.push({
        path: batch[j],
        churnCount: churnMap[batch[j]],
        lastTouched: lastTouched[j],
      })
    }
  }

  return results.sort((a, b) => b.churnCount - a.churnCount)
}
