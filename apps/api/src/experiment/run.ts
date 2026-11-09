import { createHash } from 'node:crypto'
import { execFile as execFileCallback } from 'node:child_process'
import { mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { promisify } from 'node:util'
import { homedir } from 'node:os'
import { dirname, isAbsolute, join, resolve } from 'node:path'
import type { CommitRecord, FileChurn, Hotspot } from '@wot-git/types'
import { simpleGit } from 'simple-git'
import { runHotspot } from '../services/hotspot'
import { readGitHistory } from '../services/gitHistory'
import { parseCommitReaderOutput, runCommitReader } from '../services/commitReader'
import { BUG_FIX_PATTERN, LEGACY_BUG_FIX_PATTERN } from '../utils/bugFix'
import { ANALYSIS_MAX_FILES } from '../config/limits'

const execFile = promisify(execFileCallback)

export interface ExperimentRepository {
  name: string
  url: string
  commit: string
}

export interface ExperimentConfig {
  repos: ExperimentRepository[]
  windowCommits: number
  trainFraction: number
  topFraction: number
  minFixCommits: number[]
  /** Optional override for the standard 10,000 distinct-path cap. */
  maxFiles?: number
}

export type ScoreVariant = 'mean' | 'churn' | 'size' | 'product'
export type PatternName = 'default' | 'legacy'

export interface RankingMetrics {
  n: number
  b: number
  prevalence: number
  predicted: number
  truePositive: number
  precision: number
  recall: number
  f1: number
  baselineF1: number
  lift: number
  matchedCommitShare: number
}

export interface ExperimentRow extends RankingMetrics {
  repo: string
  pattern: PatternName
  minFixCommits: number
  variant: ScoreVariant
  skipped: boolean
  reason?: string
  filesTruncated: boolean
  commitsAtFileCap: number
}

interface FileScoreRow {
  path: string
  churn: number
  size: number
  churnScore: number
  sizeScore: number
  mean: number
  product: number
  inB: boolean
}

interface RepositoryResult {
  name: string
  url: string
  requestedCommit: string
  resolvedCommit?: string
  cutoffCommit?: string
  gitVersion: string
  nodeVersion: string
  windowSize?: number
  trainCount?: number
  evaluationCount?: number
  filesInUniverse?: number
  filesTruncated?: boolean
  fileLimit: number
  commitsAtFileCap?: number
  rows?: ExperimentRow[]
  error?: string
}

export interface ExperimentResult {
  generatedAt: string
  parameters: ExperimentConfig
  patterns: Record<PatternName, { source: string; flags: string }>
  versions: { node: string; git: string }
  repositories: RepositoryResult[]
}

interface RepoOutput {
  result: RepositoryResult
  topFiles?: FileScoreRow[]
}

const SCORE_VARIANTS: ScoreVariant[] = ['mean', 'churn', 'size', 'product']
const PATTERNS: Record<PatternName, RegExp> = {
  default: BUG_FIX_PATTERN,
  legacy: LEGACY_BUG_FIX_PATTERN,
}

function assertConfig(value: unknown): ExperimentConfig {
  if (!value || typeof value !== 'object') throw new Error('Config must be a JSON object')
  const config = value as Partial<ExperimentConfig>
  if (!Array.isArray(config.repos) || config.repos.length === 0) throw new Error('Config repos must be a non-empty array')
  for (const repo of config.repos) {
    if (!repo || typeof repo.name !== 'string' || !repo.name.trim()) throw new Error('Each repo needs a name')
    if (typeof repo.url !== 'string' || !repo.url.trim()) throw new Error(`Repository ${repo.name} needs a URL`)
    if (typeof repo.commit !== 'string' || !/^[a-f0-9]{40}$/i.test(repo.commit)) throw new Error(`Repository ${repo.name} needs a full 40-character commit hash`)
  }
  if (!Number.isSafeInteger(config.windowCommits) || (config.windowCommits ?? 0) < 2) throw new Error('windowCommits must be an integer >= 2')
  if (typeof config.trainFraction !== 'number' || config.trainFraction <= 0 || config.trainFraction >= 1) throw new Error('trainFraction must be between 0 and 1')
  if (typeof config.topFraction !== 'number' || config.topFraction <= 0 || config.topFraction > 1) throw new Error('topFraction must be greater than 0 and at most 1')
  if (!Array.isArray(config.minFixCommits) || !config.minFixCommits.length || config.minFixCommits.some(k => !Number.isSafeInteger(k) || k < 1)) {
    throw new Error('minFixCommits must contain positive integers')
  }
  if (config.maxFiles !== undefined && (!Number.isSafeInteger(config.maxFiles) || config.maxFiles < 1)) throw new Error('maxFiles must be a positive safe integer')
  return config as ExperimentConfig
}

export function calculateRankingMetrics(
  universe: string[],
  truth: Set<string>,
  scores: Map<string, number>,
  topFraction: number,
  matchedCommitShare: number,
): RankingMetrics {
  const n = universe.length
  const b = truth.size
  const prevalence = n === 0 ? 0 : b / n
  const ranked = [...universe].sort((a, bPath) =>
    (scores.get(bPath) ?? 0) - (scores.get(a) ?? 0) || a.localeCompare(bPath),
  )
  const predicted = Math.min(n, Math.ceil(topFraction * n))
  const predictedSet = new Set(ranked.slice(0, predicted))
  let truePositive = 0
  for (const path of predictedSet) if (truth.has(path)) truePositive++
  const precision = predicted === 0 ? 0 : truePositive / predicted
  const recall = b === 0 ? 0 : truePositive / b
  const f1 = precision + recall === 0 ? 0 : (2 * precision * recall) / (precision + recall)
  const baselineDenominator = prevalence + topFraction
  const baselineF1 = baselineDenominator === 0 ? 0 : (2 * (prevalence * topFraction)) / baselineDenominator
  return {
    n, b, prevalence, predicted, truePositive, precision, recall, f1, baselineF1,
    lift: prevalence === 0 ? 0 : precision / prevalence,
    matchedCommitShare,
  }
}

export function selectBugFiles(
  commits: Array<Pick<CommitRecord, 'message' | 'files'>>,
  universe: Set<string>,
  pattern: RegExp,
  minFixCommits: number,
): { files: Set<string>; matchedCommitCount: number } {
  const counts = new Map<string, number>()
  let matchedCommitCount = 0
  for (const commit of commits) {
    pattern.lastIndex = 0
    if (!pattern.test(commit.message)) continue
    matchedCommitCount++
    const pathsInCommit = new Set(commit.files.map(file => file.path))
    for (const path of pathsInCommit) {
      if (universe.has(path)) counts.set(path, (counts.get(path) ?? 0) + 1)
    }
  }
  return {
    files: new Set([...counts].filter(([, count]) => count >= minFixCommits).map(([path]) => path)),
    matchedCommitCount,
  }
}

function quoteCsv(value: string | number | boolean): string {
  let text = String(value)
  if (/^[\s\u0000-\u001f]*[=+@\-]/.test(text)) text = `'${text}`
  return `"${text.replace(/"/g, '""')}"`
}

function toCsv(headers: string[], rows: Array<Array<string | number | boolean>>): string {
  return [headers, ...rows].map(row => row.map(quoteCsv).join(',')).join('\n') + '\n'
}

function repoSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'repository'
}

function cacheSlug(repo: ExperimentRepository): string {
  return `${repoSlug(repo.name)}-${createHash('sha256').update(repo.url).digest('hex').slice(0, 12)}`
}

async function gitVersion(): Promise<string> {
  const { stdout } = await execFile('git', ['--version'])
  return stdout.trim()
}

async function ensureFullClone(repo: ExperimentRepository, cacheRoot: string): Promise<string> {
  const target = join(cacheRoot, cacheSlug(repo))
  let isRepository = false
  try { isRepository = await simpleGit(target).checkIsRepo() } catch { /* cache entry is absent or invalid */ }
  if (!isRepository) {
    await rm(target, { recursive: true, force: true })
    await mkdir(dirname(target), { recursive: true })
    try {
      // Deliberately use the default full clone: no depth, filter, or timeout.
      await simpleGit().clone(repo.url, target)
    } catch (error) {
      await rm(target, { recursive: true, force: true })
      throw error
    }
  }
  const repositoryGit = simpleGit(target)
  if ((await repositoryGit.raw(['rev-parse', '--is-shallow-repository'])).trim() === 'true') {
    await repositoryGit.raw(['fetch', '--unshallow', 'origin'])
  }
  await repositoryGit.raw(['checkout', '--detach', repo.commit])
  const resolved = (await repositoryGit.revparse(['HEAD'])).trim().toLowerCase()
  if (resolved !== repo.commit.toLowerCase()) throw new Error(`Requested ${repo.commit}, but checked out ${resolved}`)
  return target
}

async function readWorkingTreeSizes(repoPath: string, files: FileChurn[]): Promise<Map<string, number>> {
  const sizes = new Map<string, number>()
  for (let offset = 0; offset < files.length; offset += 64) {
    const batch = files.slice(offset, offset + 64)
    const values = await Promise.all(batch.map(async file => {
      try { return [file.path, (await stat(join(repoPath, file.path))).size] as const }
      catch { return [file.path, 0] as const }
    }))
    for (const [path, size] of values) sizes.set(path, size)
  }
  return sizes
}

function scoreMap(items: Hotspot[], variant: ScoreVariant): Map<string, number> {
  return new Map(items.map(item => [item.path, variant === 'mean' ? item.hotspotScore : variant === 'churn' ? item.churnScore : variant === 'size' ? item.sizeScore : item.churnScore * item.sizeScore]))
}

function rowsToCsv(rows: ExperimentRow[]): string {
  const headers = ['repo', 'pattern', 'minFixCommits', 'variant', 'N', 'B', 'r', 'P', 'TP', 'precision', 'recall', 'F1', 'baselineF1', 'lift', 'matchedCommitShare', 'filesTruncated', 'commitsAtFileCap', 'skipped', 'reason']
  return toCsv(headers, rows.map(row => [row.repo, row.pattern, row.minFixCommits, row.variant, row.n, row.b, row.prevalence, row.predicted, row.truePositive, row.precision, row.recall, row.f1, row.baselineF1, row.lift, row.matchedCommitShare, row.filesTruncated, row.commitsAtFileCap, row.skipped, row.reason ?? '']))
}

async function runRepository(
  repo: ExperimentRepository,
  config: ExperimentConfig,
  cacheRoot: string,
): Promise<RepoOutput> {
  const version = await gitVersion()
  const result: RepositoryResult = {
    name: repo.name, url: repo.url, requestedCommit: repo.commit.toLowerCase(),
    gitVersion: version, nodeVersion: process.version, fileLimit: config.maxFiles ?? ANALYSIS_MAX_FILES,
  }
  try {
    const repoPath = await ensureFullClone(repo, cacheRoot)
    const git = simpleGit(repoPath)
    const window = (await git.raw(['rev-list', '--reverse', '-n', String(config.windowCommits), repo.commit])).trim().split(/\r?\n/).filter(Boolean)
    result.resolvedCommit = (await git.revparse([repo.commit])).trim().toLowerCase()
    result.windowSize = window.length
    if (window.length < 2) throw new Error(`Pinned commit has only ${window.length} commit(s) in the requested history window`)

    const trainCount = Math.floor(window.length * config.trainFraction)
    const evaluationCommits = window.slice(trainCount)
    const cutoffCommit = window[trainCount - 1]
    result.trainCount = trainCount
    result.evaluationCount = evaluationCommits.length
    result.cutoffCommit = cutoffCommit
    if (trainCount < 1 || evaluationCommits.length < 1) throw new Error('The configured split produced an empty training or evaluation window')

    await git.raw(['checkout', '--detach', cutoffCommit])
    const history = await readGitHistory(repoPath, trainCount, undefined, result.fileLimit)
    const hotspot = await runHotspot(repoPath, history.churn, undefined, result.fileLimit)
    const universe = history.churn.map(file => file.path)
    const universeSet = new Set(universe)
    const sizeByPath = await readWorkingTreeSizes(repoPath, history.churn)
    const hotByPath = new Map(hotspot.items.map(item => [item.path, item]))
    result.filesInUniverse = universe.length
    result.filesTruncated = history.filesTruncated || hotspot.filesTruncated

    await git.raw(['checkout', '--detach', repo.commit])
    const evaluated = await runCommitReader(repoPath, evaluationCommits.length)
    let commitRecords = evaluated.commitLog
    // Keep the structured Git format as a fallback if a service record is incomplete.
    if (commitRecords.length !== evaluationCommits.length || commitRecords.some(record => typeof record.message !== 'string' || !Array.isArray(record.files))) {
      const raw = await git.raw(['log', '-z', `-${evaluationCommits.length}`, '--numstat', '--format=COMMIT_START%n%H%n%an%n%ae%n%aI%n%s'])
      commitRecords = parseCommitReaderOutput(raw, evaluationCommits.length).commitLog
    }
    const commitsAtFileCap = commitRecords.filter(commit => commit.filesTruncated).length
    result.commitsAtFileCap = commitsAtFileCap
    const rows: ExperimentRow[] = []
    const topFileRows: FileScoreRow[] = []
    const meanScores = scoreMap(hotspot.items, 'mean')

    for (const patternName of ['default', 'legacy'] as const) {
      const pattern = PATTERNS[patternName]
      for (const minFixCommits of config.minFixCommits) {
        const truthResult = selectBugFiles(commitRecords, universeSet, pattern, minFixCommits)
        const share = commitRecords.length === 0 ? 0 : truthResult.matchedCommitCount / commitRecords.length
        for (const variant of SCORE_VARIANTS) {
          const metrics = calculateRankingMetrics(universe, truthResult.files, scoreMap(hotspot.items, variant), config.topFraction, share)
          rows.push({
            repo: repo.name, pattern: patternName, minFixCommits, variant,
            ...metrics,
            skipped: truthResult.files.size === 0,
            ...(truthResult.files.size === 0 ? { reason: 'No evaluation files in the training universe met this fix-commit threshold' } : {}),
            filesTruncated: Boolean(result.filesTruncated), commitsAtFileCap,
          })
          if (patternName === 'default' && minFixCommits === 1 && variant === 'mean') {
            const scoreByPath = new Map(hotspot.items.map(item => [item.path, item]))
            const pathToChurn = new Map(history.churn.map(item => [item.path, item.churnCount]))
            const ordered = [...universe].sort((a, b) =>
              (meanScores.get(b) ?? 0) - (meanScores.get(a) ?? 0) || a.localeCompare(b),
            ).slice(0, metrics.predicted)
            topFileRows.splice(0, topFileRows.length, ...ordered.map(path => {
              const score = scoreByPath.get(path)!
              return {
                path, churn: pathToChurn.get(path) ?? 0,
                size: sizeByPath.get(path) ?? 0,
                churnScore: score.churnScore, sizeScore: score.sizeScore,
                mean: score.hotspotScore, product: score.churnScore * score.sizeScore,
                inB: truthResult.files.has(path),
              }
            }))
          }
        }
      }
    }
    result.rows = rows
    return { result, topFiles: topFileRows }
  } catch (error) {
    result.error = error instanceof Error ? error.message : String(error)
    return { result }
  }
}

async function writeOutputs(config: ExperimentConfig, outputs: RepoOutput[], outputDir: string, versions: { node: string; git: string }): Promise<ExperimentResult> {
  await mkdir(outputDir, { recursive: true })
  const document: ExperimentResult = {
    generatedAt: new Date().toISOString(),
    parameters: config,
    patterns: Object.fromEntries(Object.entries(PATTERNS).map(([name, pattern]) => [name, { source: pattern.source, flags: pattern.flags }])) as ExperimentResult['patterns'],
    versions,
    repositories: outputs.map(output => output.result),
  }
  const allRows = outputs.flatMap(output => output.result.rows ?? [])
  await writeFile(join(outputDir, 'results.json'), `${JSON.stringify(document, null, 2)}\n`)
  await writeFile(join(outputDir, 'results.csv'), rowsToCsv(allRows))
  for (const output of outputs) {
    if (!output.topFiles) continue
    const headers = ['path', 'churn', 'size', 'churnScore', 'sizeScore', 'mean', 'churnOnly', 'sizeOnly', 'product', 'inB']
    const rows = output.topFiles.map(file => [file.path, file.churn, file.size, file.churnScore, file.sizeScore, file.mean, file.churnScore, file.sizeScore, file.product, file.inB])
    await writeFile(join(outputDir, `top20-${repoSlug(output.result.name)}.csv`), toCsv(headers, rows))
  }
  return document
}

export async function runExperiment(configInput: ExperimentConfig, options: { cacheDir?: string; outputDir?: string } = {}): Promise<ExperimentResult> {
  const config = assertConfig(configInput)
  const cacheDir = resolve(options.cacheDir ?? process.env.WOTGIT_EXPERIMENT_CACHE ?? join(homedir(), '.cache', 'wot-git-experiment'))
  const outputDir = resolve(options.outputDir ?? join(process.cwd(), 'experiment-results'))
  await mkdir(cacheDir, { recursive: true })
  const version = await gitVersion()
  const outputs: RepoOutput[] = []
  for (const repo of config.repos) outputs.push(await runRepository(repo, config, cacheDir))
  const result = await writeOutputs(config, outputs, outputDir, { node: process.version, git: version })
  printSummary(result.repositories)
  return result
}

function printSummary(repositories: RepositoryResult[]): void {
  const header = ['Repository', 'Commit', 'Window', 'Train', 'Eval', 'Files', 'Truncated', 'Status']
  const rows = repositories.map(repo => [
    repo.name, repo.resolvedCommit ?? '-', String(repo.windowSize ?? '-'), String(repo.trainCount ?? '-'),
    String(repo.evaluationCount ?? '-'), String(repo.filesInUniverse ?? '-'), String(repo.filesTruncated ?? '-'), repo.error ? `ERROR: ${repo.error}` : 'ok',
  ])
  const widths = header.map((cell, index) => Math.max(cell.length, ...rows.map(row => row[index].length)))
  const format = (row: string[]) => `| ${row.map((cell, index) => cell.padEnd(widths[index])).join(' | ')} |`
  console.log([format(header), format(widths.map(width => '-'.repeat(width))), ...rows.map(format)].join('\n'))
}

function optionValue(args: string[], key: string): string | undefined {
  const index = args.findIndex(arg => arg === key)
  return index >= 0 ? args[index + 1] : undefined
}

export async function main(args = process.argv.slice(2)): Promise<void> {
  const configPathArgument = optionValue(args, '--config')
  if (!configPathArgument) throw new Error('Usage: pnpm --filter @wot-git/api experiment -- --config experiment.config.json')
  const configCandidates = isAbsolute(configPathArgument)
    ? [configPathArgument]
    : [resolve(process.cwd(), configPathArgument), resolve(__dirname, '../../../..', configPathArgument)]
  let configPath = configCandidates[0]
  let configContents: string | undefined
  for (const candidate of configCandidates) {
    try {
      configContents = await readFile(candidate, 'utf8')
      configPath = candidate
      break
    } catch { /* try monorepo root when pnpm starts from the package directory */ }
  }
  if (configContents === undefined) throw new Error(`Could not read config file: ${configPathArgument}`)
  const config = assertConfig(JSON.parse(configContents))
  await runExperiment(config, { outputDir: join(dirname(configPath), 'experiment-results') })
}

if (require.main === module) {
  main().catch(error => {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  })
}
