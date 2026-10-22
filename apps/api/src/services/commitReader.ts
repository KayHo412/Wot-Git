import { simpleGit } from 'simple-git'
import type { CommitRecord, CommitFile, BugAssociatedFile } from '@wot-git/types'
import { isExcludedFile } from '../utils/fileFilter'
import { getBugFixKeyword } from '../utils/bugFix'
import { ANALYSIS_MAX_COMMITS } from '../config/limits'
import { scanGit, throwIfAborted } from '../utils/scan'

/**
 * Keyword-based heuristic for bug-fix commit classification.
 * Case-insensitive. Matches whole words from:
 * fix, bug, defect, error, issue, patch, repair, resolve, close, crash
 *
 * Reference: Sliwerski et al. (2005), Fischer et al. (2003)
 */
interface CommitReaderResult {
  commitLog: CommitRecord[]
  bugFiles: BugAssociatedFile[]
  commitsAnalyzed: number
  historyTruncated: boolean
  filesTruncated: boolean
}

export function parseCommitReaderOutput(raw: string, maxCommits: number): CommitReaderResult {
  const commitLog: CommitRecord[] = []
  let current: CommitRecord | undefined
  let historyTruncated = false
  let filesTruncated = false
  const tokens = raw.split('\0')

  for (let index = 0; index < tokens.length; index++) {
    const token = tokens[index]
    if (token.startsWith('COMMIT_START\n')) {
      if (current) commitLog.push(current)
      if (commitLog.length >= maxCommits) {
        historyTruncated = true
        break
      }
      const lines = token.split('\n')
      const hash = lines[1]?.trim()
      if (!hash || !/^[a-f0-9]{40}$/.test(hash)) {
        current = undefined
        continue
      }
      const message = lines[5] ?? ''
      const matchedBugFixKeyword = getBugFixKeyword(message)
      current = {
        hash,
        authorName: lines[2] ?? '',
        authorEmail: lines[3] ?? '',
        timestamp: lines[4] ?? '',
        message,
        files: [],
        filesTruncated: false,
        isBugFix: matchedBugFixKeyword !== null,
        matchedBugFixKeyword,
      }
      continue
    }
    if (!current || !token) continue
    const firstTab = token.indexOf('\t')
    const secondTab = token.indexOf('\t', firstTab + 1)
    if (firstTab < 0 || secondTab < 0) continue
    const insertions = token.slice(0, firstTab) === '-' ? 0 : Number(token.slice(0, firstTab)) || 0
    const deletions = token.slice(firstTab + 1, secondTab) === '-' ? 0 : Number(token.slice(firstTab + 1, secondTab)) || 0
    let path = token.slice(secondTab + 1)
    if (!path) {
      const oldPath = tokens[index + 1]
      path = tokens[index + 2] ?? oldPath ?? ''
      index += 2
    }
    if (path && !isExcludedFile(path)) {
      if (current.files.length < 100) current.files.push({ path, insertions, deletions })
      else {
        current.filesTruncated = true
        filesTruncated = true
      }
    }
  }
  if (current && commitLog.length < maxCommits) commitLog.push(current)
  else if (current) historyTruncated = true

  const bugFileMap: Record<string, { count: number; commits: string[] }> = Object.create(null)
  for (const commit of commitLog) {
    if (!commit.isBugFix) continue
    for (const file of commit.files) {
      if (!bugFileMap[file.path]) bugFileMap[file.path] = { count: 0, commits: [] }
      bugFileMap[file.path].count += 1
      bugFileMap[file.path].commits.push(commit.hash)
    }
  }
  const bugFiles = Object.entries(bugFileMap)
    .map(([path, { count, commits }]) => ({ path, bugFixCount: count, commits }))
    .sort((a, b) => b.bugFixCount - a.bugFixCount || a.path.localeCompare(b.path))
  return { commitLog, bugFiles, commitsAnalyzed: commitLog.length, historyTruncated, filesTruncated }
}

export async function runCommitReader(repoPath: string, maxCommits = ANALYSIS_MAX_COMMITS, signal?: AbortSignal): Promise<CommitReaderResult> {
  const git = scanGit(repoPath, signal)

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
    'log', '-z', `-${maxCommits + 1}`, '--numstat',
    '--format=COMMIT_START%n%H%n%an%n%ae%n%aI%n%s',
  ])

  throwIfAborted(signal)
  return parseCommitReaderOutput(raw, maxCommits)
}
