import { simpleGit } from 'simple-git'
import type { FileOwnership } from '@wot-git/types'

export async function runOwnership(repoPath: string, filePaths: string[]): Promise<FileOwnership[]> {
  const git = simpleGit(repoPath)
  const results: FileOwnership[] = []

  const BATCH = 50
  for (let i = 0; i < filePaths.length; i += BATCH) {
    const batch = filePaths.slice(i, i + BATCH)
    const batchResults = await Promise.all(
      batch.map(async (path) => {
        try {
          const log = await git.raw(['log', '--format=%ae', '--follow', '--', path])
          const emails = log.split('\n').map(e => e.trim()).filter(Boolean)

          if (emails.length === 0) {
            return {
              path,
              authors: [],
              dominantAuthor: 'unknown',
              isBusFactor: false,
            }
          }

          // Count commits per author
          const authorCounts: Record<string, number> = {}
          for (const email of emails) {
            authorCounts[email] = (authorCounts[email] || 0) + 1
          }

          const uniqueAuthors = Object.keys(authorCounts)
          const dominantAuthor = uniqueAuthors.reduce((a, b) =>
            authorCounts[a] >= authorCounts[b] ? a : b
          )

          return {
            path,
            authors: uniqueAuthors,
            dominantAuthor,
            isBusFactor: uniqueAuthors.length === 1,
          } satisfies FileOwnership
        } catch {
          return {
            path,
            authors: [],
            dominantAuthor: 'unknown',
            isBusFactor: false,
          }
        }
      })
    )
    results.push(...batchResults)
  }

  return results
}
