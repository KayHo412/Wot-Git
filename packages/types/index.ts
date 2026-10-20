export interface CommitFrequency {
  date: string
  count: number
}

export interface CommitSize {
  hash: string
  date: string
  insertions: number
  deletions: number
}

export interface FileChurn {
  path: string
  churnCount: number
  lastTouched: string
}

export interface FileOwnership {
  path: string
  authors: string[]
  dominantAuthor: string
  isBusFactor: boolean
}

export interface Hotspot {
  path: string
  churnScore: number
  sizeScore: number
  hotspotScore: number
}

export interface CoChange {
  fileA: string
  fileB: string
  count: number
}

export interface FileOutline {
  name: string
  type: 'function' | 'class'
  line: number
}

// One file's contribution inside a single commit (from git log --numstat)
export interface CommitFile {
  path: string
  insertions: number
  deletions: number
}

// A fully structured individual commit record
export interface CommitRecord {
  hash: string         // 40-char SHA-1
  authorName: string   // git %an — display name
  authorEmail: string  // git %ae — email
  timestamp: string    // git %aI — strict ISO 8601 with timezone
  message: string      // git %s  — commit subject (first line)
  files: CommitFile[]  // per-file numstat for this commit
  isBugFix: boolean    // true if message matches bug-fix keyword heuristic
}

// A file that appeared in one or more bug-fix commits
export interface BugAssociatedFile {
  path: string
  bugFixCount: number  // number of bug-fix commits that touched this file
  commits: string[]    // hashes of those bug-fix commits
}

export interface AnalysisResult {
  repoUrl: string
  analyzedAt: string
  commits: CommitFrequency[]
  commitSizes: CommitSize[]
  churn: FileChurn[]
  ownership: FileOwnership[]
  hotspots: Hotspot[]
  cochange: CoChange[]
  outline: Record<string, FileOutline[]>
  commitLog: CommitRecord[]       // full structured commit history
  bugFiles: BugAssociatedFile[]   // files associated with bug-fix commits
  scan: {
    commitLimit: number
    commitsAnalyzed: number
    historyTruncated: boolean
    fileLimit: number
    filesAnalyzed: number
    filesTruncated: boolean
    commitFilesTruncated: boolean
    ownershipTruncated: boolean
    cochangeTruncated: boolean
    outlineFileLimit: number
    outlineTruncated: boolean
  }
}

export interface RepositoryOverview {
  readmePath: string | null
  readmeTitle: string | null
  readmeSummary: string | null
  readmeContent: string | null
  readmeImageBaseUrl: string | null
}

export interface DashboardResult {
  analysis: AnalysisResult
  health: RepoHealthResult
  overview: RepositoryOverview
}

export type DashboardPhase = 'clone' | 'analysis' | 'health' | 'prepare'

export type DashboardStreamMessage =
  | { type: 'stage'; phase: DashboardPhase; status: 'running' | 'complete' }
  | { type: 'cache' }
  | { type: 'complete'; result: DashboardResult }
  | { type: 'error'; error: string; code: AnalysisError['code'] }

export interface AnalysisError {
  error: string
  code: 'REPO_NOT_FOUND' | 'REPO_TOO_LARGE' | 'REPO_SIZE_LIMIT' | 'CLONE_TIMEOUT' | 'SCAN_TIMEOUT' | 'SCAN_ABORTED' | 'INVALID_URL' | 'INTERNAL_ERROR'
}

export type HealthCategoryId = 'changes' | 'testing' | 'documentation' | 'automation' | 'security' | 'deployment'
export type HealthStatus = 'healthy' | 'needs_attention' | 'not_applicable'

export interface HealthCategory {
  id: HealthCategoryId
  label: string
  score: number | null
  status: HealthStatus
  summary: string
}

export interface HealthFinding {
  id: string
  category: HealthCategoryId
  severity: 'info' | 'warning' | 'high'
  title: string
  summary: string
  path?: string
  line?: number
  url?: string
}

export interface HealthTimelinePoint {
  month: string
  overallScore: number
  commitCount: number
  hotspotFileCount: number
  trackedEnvFileCount: number
  hasReadme: boolean
  hasTests: boolean
  hasCi: boolean
  hasDocker: boolean
}

export interface RepoHealthResult {
  repoUrl: string
  analyzedAt: string
  projectType: 'application' | 'library' | 'unknown'
  overallScore: number
  categories: HealthCategory[]
  findings: HealthFinding[]
  timeline: HealthTimelinePoint[]
  timelineTruncated: boolean
  historyCommitLimit: number
  historyCommitsAnalyzed: number
  historyTruncated: boolean
  historyFilesTruncated: boolean
  filesTruncated: boolean
  secretScan: 'current_revision_only'
  secretScanTruncated: boolean
}
