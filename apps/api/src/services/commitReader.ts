import { simpleGit } from 'simple-git'
import type { CommitRecord, CommitFile, BugAssociatedFile } from '@wot-git/types'

/**
 * Keyword-based heuristic for bug-fix commit classification.
 * Case-insensitive. Matches any commit message containing one of:
 * fix, bug, defect, error, issue, patch, repair, resolve, close, crash
 *
 * Reference: Sliwerski et al. (2005), Fischer et al. (2003)
 */
const BUG_FIX_PATTERN = /fix|bug|defect|error|issue|patch|repair|resolve|close|crash/i

interface CommitReaderResult {
  commitLog: CommitRecord[]
  bugFiles: BugAssociatedFile[]
}

export async function runCommitReader(repoPath: string): Promise<CommitReaderResult> {
  const git = simpleGit(repoPath)

  /**
   * Single git log call that emits a structured header block for each commit
   * followed by its per-file numstat (insertions / deletions per file).
   *
   * Output format per commit:
   *   COMMIT_START
   *   <hash>          (%H)
   *   <author name>   (%an)
   *   <author email>  (%ae)
   *   <ISO timestamp> (%aI  -- strict ISO 8601 with timezone)
   *   <subject>       (%s   -- first line of commit message)
   *   <blank line>
   *   <ins>\t<del>\t<filepath>   (numstat rows)
   *   ...
   *   <blank line>
   */
  const raw = await git.raw([
    'log',
    '--numstat',
    '--format=COMMIT_START%n%H%n%an%n%ae%n%aI%n%s',
  ])

  if (!raw.trim()) return { commitLog: [], bugFiles: [] }

  // Split into per-commit blocks using the sentinel string
  const blocks = raw.split('COMMIT_START\n').filter(Boolean)

  const commitLog: CommitRecord[] = []

  for (const block of blocks) {
    const lines = block.split('\n')

    // Header fields (lines 0-4, matching the format= order above)
    const hash        = lines[0]?.trim()
    const authorName  = lines[1]?.trim()
    const authorEmail = lines[2]?.trim()
    const timestamp   = lines[3]?.trim()
    const message     = lines[4]?.trim()

    if (!hash || !/^[a-f0-9]{40}$/.test(hash)) continue

    // Parse numstat rows starting after the blank separator line (index 5)
    // Each numstat row: "<insertions>\t<deletions>\t<filepath>"
    // Binary files use "-" instead of a number -- treated as 0
    const files: CommitFile[] = []
    for (let i = 5; i < lines.length; i++) {
      const line = lines[i].trim()
      if (!line) continue

      const parts = line.split('\t')
      if (parts.length < 3) continue

      const insertions = parts[0] === '-' ? 0 : parseInt(parts[0], 10)
      const deletions  = parts[1] === '-' ? 0 : parseInt(parts[1], 10)
      const path       = parts.slice(2).join('\t') // handles paths containing tabs (rare)

      if (!path) continue
      files.push({ path, insertions, deletions })
    }

    const isBugFix = BUG_FIX_PATTERN.test(message ?? '')

    commitLog.push({
      hash,
      authorName:  authorName  ?? '',
      authorEmail: authorEmail ?? '',
      timestamp:   timestamp   ?? '',
      message:     message     ?? '',
      files,
      isBugFix,
    })
  }

  // --- Derive bug-associated files ---
  // A file is bug-associated if it appears in at least one bug-fix commit.
  const bugFileMap: Record<string, { count: number; commits: string[] }> = {}

  for (const commit of commitLog) {
    if (!commit.isBugFix) continue
    for (const file of commit.files) {
      if (!bugFileMap[file.path]) {
        bugFileMap[file.path] = { count: 0, commits: [] }
      }
      bugFileMap[file.path].count += 1
      bugFileMap[file.path].commits.push(commit.hash)
    }
  }

  const bugFiles: BugAssociatedFile[] = Object.entries(bugFileMap)
    .map(([path, { count, commits }]) => ({
      path,
      bugFixCount: count,
      commits,
    }))
    .sort((a, b) => b.bugFixCount - a.bugFixCount)

  return { commitLog, bugFiles }
}
