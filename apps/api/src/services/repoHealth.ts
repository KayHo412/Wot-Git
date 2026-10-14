import { lstat, readFile } from 'fs/promises'
import { simpleGit } from 'simple-git'
import { isAbsolute, relative, resolve } from 'path'
import type {
  HealthCategory,
  HealthCategoryId,
  HealthFinding,
  HealthTimelinePoint,
  RepoHealthResult,
} from '@wot-git/types'
import { HEALTH_MAX_HISTORY_COMMITS, HEALTH_MAX_TIMELINE_MONTHS } from '../config/limits'

const MAX_SECRET_FILES = 2_000
const MAX_SECRET_FILE_BYTES = 512 * 1024
const MAX_SECRET_SCAN_BYTES = 20 * 1024 * 1024

interface HistoricalCommit {
  hash: string
  date: string
  month: string
  subject: string
  files: string[]
}

interface RepoSignals {
  readme: boolean
  docs: boolean
  testFiles: boolean
  testConfig: boolean
  ci: boolean
  docker: boolean
  envFiles: string[]
}

const SOURCE_EXTENSIONS = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.py', '.java', '.cs', '.go',
  '.rs', '.c', '.h', '.cc', '.cpp', '.hpp', '.php', '.rb', '.swift', '.kt',
  '.scala', '.vue', '.svelte', '.sh', '.sql',
])

const BUG_FIX_PATTERN = /\b(fix|bug|defect|error|issue|patch|repair|resolve|close|crash)\b/i
const SECRET_PATTERNS: Array<{ id: string; regex: RegExp }> = [
  { id: 'private-key', regex: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/ },
  { id: 'aws-access-key', regex: /\bAKIA[0-9A-Z]{16}\b/ },
  { id: 'github-token', regex: /\bgh[pousr]_[A-Za-z0-9]{30,}\b/ },
  {
    id: 'credential-assignment',
    regex: /\b(?:api[_-]?key|client[_-]?secret|password|secret|token)\s*[:=]\s*["'`]?([A-Za-z0-9/+=_.-]{20,})/i,
  },
]

function isSourcePath(path: string): boolean {
  const normalized = path.replace(/\\/g, '/')
  if (/(^|\/)(node_modules|vendor|dist|build|coverage|\.next|\.git)(\/|$)/i.test(normalized)) return false
  if (/(^|\/)(package-lock\.json|pnpm-lock\.yaml|yarn\.lock|Cargo\.lock)$/i.test(normalized)) return false
  const name = normalized.split('/').pop() ?? ''
  const ext = name.includes('.') ? `.${name.split('.').pop()?.toLowerCase()}` : ''
  return SOURCE_EXTENSIONS.has(ext)
}

function isEnvFile(path: string): boolean {
  const name = path.replace(/\\/g, '/').split('/').pop()?.toLowerCase() ?? ''
  if (!/^\.env(?:\..+)?$/.test(name)) return false
  return !/^\.env(?:\..+)?\.(?:example|sample|template|dist|test|testing)$/.test(name)
}

function monthOf(date: string): string {
  return date.slice(0, 7)
}

function monthBefore(month: string, count: number): string {
  const [year, monthNumber] = month.split('-').map(Number)
  const date = new Date(Date.UTC(year, monthNumber - 1 - count, 1))
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`
}

async function readRegularRepoFile(repoPath: string, relativePath: string, maxBytes: number): Promise<Buffer> {
  const fullPath = resolve(repoPath, relativePath)
  const fromRepo = relative(resolve(repoPath), fullPath)
  if (!fromRepo || fromRepo === '..' || fromRepo.startsWith(`..${process.platform === 'win32' ? '\\' : '/'}`) || isAbsolute(fromRepo)) {
    throw new Error('Path escapes repository root')
  }
  const info = await lstat(fullPath)
  if (!info.isFile() || info.isSymbolicLink()) {
    throw new Error('Not a regular repository file')
  }
  if (info.size > maxBytes) {
    const error = new Error('Repository file exceeds scan size limit') as NodeJS.ErrnoException
    error.code = 'FILE_TOO_LARGE'
    throw error
  }
  return readFile(fullPath)
}

function parseCommits(raw: string): HistoricalCommit[] {
  const commits: HistoricalCommit[] = []
  let current: HistoricalCommit | null = null

  for (const line of raw.split('\n')) {
    const header = line.match(/^([a-f0-9]{40})\t(\d{4}-\d{2}-\d{2})\t(.*)$/)
    if (header) {
      current = {
        hash: header[1],
        date: header[2],
        month: monthOf(header[2]),
        subject: header[3],
        files: [],
      }
      commits.push(current)
    } else if (current && line.trim()) {
      current.files.push(line.trim())
    }
  }
  return commits
}

function getSignals(paths: string[]): RepoSignals {
  const normalized = paths.map(path => path.replace(/\\/g, '/'))
  const hasPath = (regex: RegExp) => normalized.some(path => regex.test(path))
  return {
    readme: normalized.some(path => /^README(?:\.[^/]*)?$/i.test(path.split('/').pop() ?? '')),
    docs: hasPath(/^(?:docs?|documentation)\//i) || normalized.some(path => /\.(?:md|rst|adoc)$/i.test(path) && !/^README(?:\.|$)/i.test(path.split('/').pop() ?? '')),
    testFiles: normalized.some(path =>
      /(^|\/)(__tests__|tests?|spec)\//i.test(path) ||
      /(?:\.|_)(?:test|spec)\.[^.]+$/i.test(path.split('/').pop() ?? ''),
    ),
    testConfig: normalized.some(path => {
      const name = path.split('/').pop()?.toLowerCase() ?? ''
      return /^(?:jest|vitest|playwright|cypress|pytest|tox)\.config\./.test(name) ||
        ['pytest.ini', 'tox.ini', '.mocharc.json', '.mocharc.yml'].includes(name)
    }),
    ci: hasPath(/^\.github\/workflows\/.+\.ya?ml$/i) ||
      normalized.some(path => /^\.gitlab-ci\.ya?ml$/i.test(path) || /^\.circleci\/config\.ya?ml$/i.test(path) ||
        /^azure-pipelines\.ya?ml$/i.test(path) || /^Jenkinsfile$/i.test(path) || /^\.buildkite\/pipeline\.ya?ml$/i.test(path)),
    docker: normalized.some(path => /^Dockerfile(?:\.[^/]*)?$/i.test(path.split('/').pop() ?? '') ||
      /^docker-compose(?:\.[^/]*)?\.ya?ml$/i.test(path.split('/').pop() ?? '') ||
      /^compose\.ya?ml$/i.test(path.split('/').pop() ?? '')),
    envFiles: normalized.filter(isEnvFile),
  }
}

async function classifyProject(repoPath: string, paths: string[]): Promise<RepoHealthResult['projectType']> {
  const manifests = paths.filter(path => path.endsWith('package.json'))
  for (const manifest of manifests) {
    try {
      const pkg = JSON.parse((await readRegularRepoFile(repoPath, manifest, 1024 * 1024)).toString('utf8'))
      const scripts = pkg.scripts ?? {}
      const dependencies = { ...pkg.dependencies, ...pkg.devDependencies }
      if (scripts.start || scripts.serve || dependencies.next || dependencies.nuxt || dependencies.vite || dependencies.express) {
        return 'application'
      }
      if (pkg.main || pkg.exports || pkg.types || pkg.bin) return 'library'
    } catch {
      // A malformed manifest should not prevent the other static checks.
    }
  }

  if (paths.some(path => /(^|\/)src\/main\.(?:rs|java)$/.test(path) || /(^|\/)manage\.py$/.test(path))) return 'application'
  if (paths.some(path => /(^|\/)src\/lib\.rs$/.test(path))) return 'library'
  if (paths.some(path => /\.csproj$/.test(path))) {
    for (const project of paths.filter(path => path.endsWith('.csproj'))) {
      try {
        if ((await readRegularRepoFile(repoPath, project, 1024 * 1024)).toString('utf8').includes('Microsoft.NET.Sdk.Web')) return 'application'
      } catch {
        // Continue with other project files.
      }
    }
  }
  return 'unknown'
}

function scoreFor(id: HealthCategoryId, signals: RepoSignals, projectType: RepoHealthResult['projectType'], hotspotCount: number, sourceFileCount: number, hasLikelySecret: boolean): number | null {
  switch (id) {
    case 'changes': {
      if (sourceFileCount === 0) return null
      const ratio = sourceFileCount > 0 ? hotspotCount / sourceFileCount : 0
      return Math.max(0, Math.round(100 - Math.min(100, ratio * 300)))
    }
    case 'testing':
      return (signals.testFiles ? 50 : 0) + (signals.testConfig ? 50 : 0)
    case 'documentation':
      return (signals.readme ? 60 : 0) + (signals.docs ? 40 : 0)
    case 'automation':
      return signals.ci ? 100 : 0
    case 'security':
      if (hasLikelySecret) return 0
      return signals.envFiles.length > 0 ? 30 : 100
    case 'deployment':
      if (projectType !== 'application') return null
      return signals.docker ? 100 : 0
  }
}

function categoryStatus(score: number | null): HealthCategory['status'] {
  if (score === null) return 'not_applicable'
  return score >= 70 ? 'healthy' : 'needs_attention'
}

function makeCategories(signals: RepoSignals, projectType: RepoHealthResult['projectType'], hotspotCount: number, sourceFileCount: number, hasLikelySecret: boolean): HealthCategory[] {
  const descriptions: Array<{ id: HealthCategoryId; label: string; summary: string }> = [
    { id: 'changes', label: 'Change risk', summary: sourceFileCount === 0
      ? 'No tracked source files changed in the last 12 months, so this category is not scored.'
      : `${hotspotCount} source files changed in 5+ commits during the last 12 months. Score loses 3 points per percentage point of these files.` },
    { id: 'testing', label: 'Tests', summary: `${signals.testFiles ? 'Test files found (+50 points)' : 'No test files found (+0 points)'}; ${signals.testConfig ? 'recognized test configuration found (+50 points)' : 'no recognized test configuration (+0 points)'}.` },
    { id: 'documentation', label: 'Documentation', summary: `${signals.readme ? 'README found (+60 points)' : 'README missing (+0 points)'}; ${signals.docs ? 'additional documentation found (+40 points)' : 'no additional documentation (+0 points)'}.` },
    { id: 'automation', label: 'Continuous integration', summary: signals.ci ? 'Recognized CI configuration found (100 points).' : 'No recognized CI configuration found (0 points).' },
    { id: 'security', label: 'Secret hygiene', summary: hasLikelySecret ? 'Likely secret patterns were detected (0 points); values are redacted.' : signals.envFiles.length ? 'Tracked environment files were found (30 points).' : 'No tracked environment file or likely secret pattern found in the scanned revision (100 points).' },
    { id: 'deployment', label: 'Container setup', summary: projectType !== 'application' ? 'Container setup is not scored for this repository type.' : signals.docker ? 'Docker configuration found (100 points).' : 'No Docker configuration found for this application (0 points).' },
  ]

  return descriptions.map(({ id, label, summary }) => {
    const score = scoreFor(id, signals, projectType, hotspotCount, sourceFileCount, hasLikelySecret)
    return { id, label, score, status: categoryStatus(score), summary }
  })
}

function makeFindings(signals: RepoSignals, likelySecrets: Array<{ path: string; line: number; pattern: string }>, hotspotCount: number, bugFixFiles: number, projectType: RepoHealthResult['projectType']): HealthFinding[] {
  const findings: HealthFinding[] = []
  const add = (finding: HealthFinding) => findings.push(finding)

  if (!signals.readme) add({ id: 'readme-missing', category: 'documentation', severity: 'warning', title: 'README not found', summary: 'A README helps people understand what the repository does and how to use it.' })
  if (!signals.testFiles) add({ id: 'tests-missing', category: 'testing', severity: 'warning', title: 'No test files detected', summary: 'Static checks found no recognizable test files. This does not establish whether tests exist in another form.' })
  if (!signals.ci) add({ id: 'ci-missing', category: 'automation', severity: 'warning', title: 'No CI configuration detected', summary: 'No common continuous-integration configuration was found in the tracked files.' })
  if (projectType === 'application' && !signals.docker) add({ id: 'docker-missing', category: 'deployment', severity: 'info', title: 'Docker configuration not detected', summary: 'No Dockerfile or Compose configuration was found for this application.' })
  if (signals.envFiles.length) add({ id: 'env-tracked', category: 'security', severity: 'warning', title: 'Tracked environment file detected', summary: 'Environment files can contain credentials. Review the file and remove any secrets from repository history.', path: signals.envFiles[0] })
  for (const secret of likelySecrets) {
    add({ id: `secret-${secret.path}-${secret.line}-${secret.pattern}`, category: 'security', severity: 'high', title: 'Possible exposed credential', summary: `A ${secret.pattern} pattern was detected. The matched value is not included in this response.`, path: secret.path, line: secret.line })
  }
  if (hotspotCount) add({ id: 'repeated-change-files', category: 'changes', severity: 'warning', title: `${hotspotCount} repeatedly changed source files`, summary: 'Repeated changes are a review signal, not proof that a file is broken.' })
  if (bugFixFiles) add({ id: 'bug-fix-files', category: 'changes', severity: 'info', title: `${bugFixFiles} files appeared in bug-fix commits`, summary: 'Bug-fix associations use commit-message keywords and can include false positives.' })

  const severityOrder = { high: 0, warning: 1, info: 2 }
  return findings.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])
}

function pointScore(signals: RepoSignals, projectType: RepoHealthResult['projectType'], hotspotCount: number, sourceFileCount: number): number {
  const categories = makeCategories(signals, projectType, hotspotCount, sourceFileCount, false)
  const applicable = categories.map(category => category.score).filter((score): score is number => score !== null)
  return Math.round(applicable.reduce((sum, score) => sum + score, 0) / applicable.length)
}

async function scanCurrentSecrets(repoPath: string, paths: string[]): Promise<{ findings: Array<{ path: string; line: number; pattern: string }>; truncated: boolean }> {
  const candidates = paths.filter(path => /\.(?:[cm]?[jt]sx?|py|java|cs|go|rs|ya?ml|toml|ini|conf|cfg|sh|env|json|xml|properties|pem)$/i.test(path))
  const findings: Array<{ path: string; line: number; pattern: string }> = []
  let bytesRead = 0
  let truncated = candidates.length > MAX_SECRET_FILES

  for (const path of candidates.slice(0, MAX_SECRET_FILES)) {
    if (bytesRead >= MAX_SECRET_SCAN_BYTES) {
      truncated = true
      break
    }
    try {
      const content = await readRegularRepoFile(repoPath, path, MAX_SECRET_FILE_BYTES)
      if (content.includes(0)) continue
      bytesRead += content.length
      const text = content.toString('utf8')
      const lines = text.split('\n')
      for (let index = 0; index < lines.length; index++) {
        const line = lines[index]
        for (const { id, regex } of SECRET_PATTERNS) {
          const match = line.match(regex)
          if (!match) continue
          const value = (match[1] ?? match[0]).toLowerCase()
          if (/^(?:example|changeme|change_me|placeholder|your[_ -]|xxx+|<)/i.test(value)) continue
          findings.push({ path, line: index + 1, pattern: id })
          if (findings.length >= 100) {
            truncated = true
            break
          }
          break
        }
        if (findings.length >= 100) break
      }
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'FILE_TOO_LARGE') truncated = true
      // Ignore unreadable or concurrently removed files.
    }
    if (findings.length >= 100) break
  }
  return { findings, truncated }
}

function calculateHotspots(commits: HistoricalCommit[], throughMonth: string): { count: number; sourceFileCount: number; bugFixFiles: number } {
  const startMonth = monthBefore(throughMonth, 11)
  const touched = new Map<string, number>()
  const bugFiles = new Set<string>()
  const sourceFiles = new Set<string>()
  for (const commit of commits) {
    if (commit.month < startMonth || commit.month > throughMonth) continue
    for (const path of commit.files) {
      if (!isSourcePath(path)) continue
      sourceFiles.add(path)
      touched.set(path, (touched.get(path) ?? 0) + 1)
      if (BUG_FIX_PATTERN.test(commit.subject)) bugFiles.add(path)
    }
  }
  return {
    count: [...touched.values()].filter(count => count >= 5).length,
    sourceFileCount: sourceFiles.size,
    bugFixFiles: bugFiles.size,
  }
}

async function buildTimeline(repoPath: string, commits: HistoricalCommit[], projectType: RepoHealthResult['projectType']): Promise<{ points: HealthTimelinePoint[]; truncated: boolean }> {
  const latestByMonth = new Map<string, HistoricalCommit>()
  for (const commit of commits) {
    const existing = latestByMonth.get(commit.month)
    if (!existing || commit.date >= existing.date) latestByMonth.set(commit.month, commit)
  }
  const months = [...latestByMonth.keys()].sort()
  const truncated = months.length > HEALTH_MAX_TIMELINE_MONTHS
  const selectedMonths = months.slice(-HEALTH_MAX_TIMELINE_MONTHS)
  const results: HealthTimelinePoint[] = []

  // Bound simultaneous Git subprocesses when reconstructing monthly trees.
  for (let offset = 0; offset < selectedMonths.length; offset += 6) {
    const batch = selectedMonths.slice(offset, offset + 6)
    const points = await Promise.all(batch.map(async month => {
      const commit = latestByMonth.get(month)!
      const tree = await simpleGit(repoPath).raw(['ls-tree', '-r', '--name-only', commit.hash])
      const signals = getSignals(tree.split('\n').map(path => path.trim()).filter(Boolean))
      const risk = calculateHotspots(commits, month)
      const monthCommits = commits.filter(item => item.month === month).length
      return {
        month,
        overallScore: pointScore(signals, projectType, risk.count, risk.sourceFileCount),
        commitCount: monthCommits,
        hotspotFileCount: risk.count,
        trackedEnvFileCount: signals.envFiles.length,
        hasReadme: signals.readme,
        hasTests: signals.testFiles,
        hasCi: signals.ci,
        hasDocker: signals.docker,
      }
    }))
    results.push(...points)
  }
  return { points: results, truncated }
}

export async function runRepoHealth(repoPath: string, repoUrl: string): Promise<RepoHealthResult> {
  const git = simpleGit(repoPath)
  const historyRaw = await git.raw(['log', `-${HEALTH_MAX_HISTORY_COMMITS + 1}`, '--date=short', '--format=%H%x09%ad%x09%s', '--name-only'])
  const commits = parseCommits(historyRaw)
  const historyTruncated = commits.length > HEALTH_MAX_HISTORY_COMMITS
  const analyzedCommits = commits.slice(0, HEALTH_MAX_HISTORY_COMMITS)
  const currentHash = await git.raw(['rev-parse', 'HEAD'])
  const treeRaw = await git.raw(['ls-tree', '-r', '--name-only', currentHash.trim()])
  const currentPaths = treeRaw.split('\n').map(path => path.trim()).filter(Boolean)
  const signals = getSignals(currentPaths)
  const projectType = await classifyProject(repoPath, currentPaths)
  const latestMonth = commits[0]?.month ?? monthOf(new Date().toISOString())
  const risk = calculateHotspots(analyzedCommits, latestMonth)
  const secretScan = await scanCurrentSecrets(repoPath, currentPaths)
  const categories = makeCategories(signals, projectType, risk.count, risk.sourceFileCount, secretScan.findings.length > 0)
  const applicableScores = categories.map(category => category.score).filter((score): score is number => score !== null)
  const overallScore = applicableScores.length
    ? Math.round(applicableScores.reduce((sum, score) => sum + score, 0) / applicableScores.length)
    : 0
  const findings = makeFindings(signals, secretScan.findings, risk.count, risk.bugFixFiles, projectType)
  const timeline = await buildTimeline(repoPath, analyzedCommits, projectType)

  // Preserve a clear coverage signal if the commit cap was reached.
  const timelineTruncated = timeline.truncated

  return {
    repoUrl,
    analyzedAt: new Date().toISOString(),
    projectType,
    overallScore,
    categories,
    findings,
    timeline: timeline.points,
    timelineTruncated,
    historyCommitLimit: HEALTH_MAX_HISTORY_COMMITS,
    historyCommitsAnalyzed: analyzedCommits.length,
    historyTruncated,
    secretScan: 'current_revision_only',
    secretScanTruncated: secretScan.truncated,
  }
}
