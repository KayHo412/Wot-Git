import { simpleGit } from 'simple-git'
import type { CoChange } from '@wot-git/types'

const EXCLUDED_EXTENSIONS = new Set([
  '.md', '.txt', '.json', '.yml', '.yaml', '.html', '.css', '.scss',
  '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.lock', '.toml'
])

const EXCLUDED_FILENAMES = new Set([
  'package.json', 'package-lock.json', 'pnpm-lock.yaml', 'yarn.lock',
  '.gitignore', '.eslintignore', '.prettierignore'
])

const EXCLUDED_DIRS = ['docs/', 'examples/', 'benchmarks/', 'spec/', '.github/']

function isExcludedFile(path: string): boolean {
  const normalized = path.replace(/\\/g, '/')
  const filename = normalized.split('/').pop() || ''

  if (EXCLUDED_FILENAMES.has(filename)) return true

  const ext = filename.includes('.') ? '.' + filename.split('.').pop()?.toLowerCase() : ''
  if (EXCLUDED_EXTENSIONS.has(ext)) return true

  if (EXCLUDED_DIRS.some(dir => normalized.startsWith(dir) || normalized.includes('/' + dir))) return true

  return false
}

export async function runCoChange(repoPath: string): Promise<CoChange[]> {
  const git = simpleGit(repoPath)

  // Get all commits with their changed files
  const log = await git.raw(['log', '--name-only', '--format=%H'])
  const lines = log.split('\n').map(l => l.trim()).filter(Boolean)

  // Group files by commit hash
  const commitFiles: Record<string, string[]> = {}
  let currentHash: string | null = null

  for (const line of lines) {
    // Lines that look like a git hash (40 hex chars)
    if (/^[a-f0-9]{40}$/.test(line)) {
      currentHash = line
      commitFiles[currentHash] = []
    } else if (currentHash && !isExcludedFile(line)) {
      commitFiles[currentHash].push(line)
    }
  }

  // Build co-change frequency matrix
  const pairCounts: Record<string, number> = {}

  for (const files of Object.values(commitFiles)) {
    if (files.length < 2) continue

    // For each pair of files in this commit
    for (let i = 0; i < files.length; i++) {
      for (let j = i + 1; j < files.length; j++) {
        // Normalize pair order so A-B and B-A are the same key
        const key = [files[i], files[j]].sort().join('|||')
        pairCounts[key] = (pairCounts[key] || 0) + 1
      }
    }
  }

  // Convert to array, filter noise (pairs that only co-changed once)
  const results: CoChange[] = Object.entries(pairCounts)
    .filter(([, count]) => count > 1)
    .map(([key, count]) => {
      const [fileA, fileB] = key.split('|||')
      return { fileA, fileB, count }
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 200) // Return top 200 pairs

  return results
}
