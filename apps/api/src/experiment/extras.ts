import { mkdir, writeFile, readFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join, resolve, extname } from 'node:path'
import { simpleGit } from 'simple-git'
import { runHotspot } from '../services/hotspot'
import { readGitHistory } from '../services/gitHistory'
import { runCommitReader } from '../services/commitReader'
import { BUG_FIX_PATTERN } from '../utils/bugFix'
import { ANALYSIS_MAX_FILES } from '../config/limits'
import type { ExperimentConfig } from './run'

/**
 * Additional measures for the thesis, computed from the same services as the experiment runner:
 * AUC, share of bug-fix changes in the predicted set, test-file shares, file types, directories,
 * period dates and commit statistics of the analysis window. Repositories must already be
 * cloned by `pnpm experiment` (same cache directory).
 */

const TEST_DIRECTORIES = new Set(['test', 'tests', '__tests__', '__test__', 'spec', 'specs', 'testdata', 'testing'])

export function isTestFile(path: string): boolean {
  const parts = path.split('/')
  const name = parts[parts.length - 1]
  if (parts.slice(0, -1).some(part => TEST_DIRECTORIES.has(part.toLowerCase()))) return true
  return /^test_.*\.py$/.test(name) || /_test\.(py|go)$/.test(name) ||
    /\.(test|spec)\.[cm]?[jt]sx?$/.test(name) || /(Test|Tests|IT)\.java$/.test(name)
}

/** Probability that a bug-associated file scores higher than a non-bug file (ties count one half). */
export function calculateAuc(scores: Map<string, number>, truth: Set<string>): number {
  const entries = [...scores].map(([path, score]) => ({ score, positive: truth.has(path) }))
  const positives = entries.filter(entry => entry.positive).length
  const negatives = entries.length - positives
  if (positives === 0 || negatives === 0) return NaN
  entries.sort((a, b) => a.score - b.score)
  let rankSum = 0
  for (let i = 0; i < entries.length;) {
    let j = i
    while (j < entries.length && entries[j].score === entries[i].score) j++
    const averageRank = (i + 1 + j) / 2
    for (let k = i; k < j; k++) if (entries[k].positive) rankSum += averageRank
    i = j
  }
  return (rankSum - (positives * (positives + 1)) / 2) / (positives * negatives)
}

function top<T extends string>(items: T[], n: number): Array<[T, number]> {
  const counts = new Map<T, number>()
  for (const item of items) counts.set(item, (counts.get(item) ?? 0) + 1)
  return [...counts].sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0]))).slice(0, n)
}

async function analyse(name: string, repoPath: string, commit: string, config: ExperimentConfig) {
  const git = simpleGit(repoPath)
  await git.raw(['checkout', '--detach', '-q', commit])
  const window = (await git.raw(['log', '--format=%H%x00%as%x00%s', '-n', String(config.windowCommits), commit]))
    .split('\n').filter(Boolean).map(line => { const [hash, date, subject] = line.split('\0'); return { hash, date, subject } })
  window.reverse() // oldest first
  const trainCount = Math.floor(window.length * config.trainFraction)
  const cutoff = window[trainCount - 1]
  const evaluationCount = window.length - trainCount
  const maxFiles = config.maxFiles ?? ANALYSIS_MAX_FILES

  // Window statistics: bug-fix share, empty commits and the most common first words of the subjects.
  const bugFixCommitsInWindow = window.filter(c => BUG_FIX_PATTERN.test(c.subject)).length
  const firstWords = top(window.map(c => c.subject.split(/\s+/)[0] ?? ''), 6)
  const namesOnly = await git.raw(['log', '-z', '--format=%x1e%H', '--name-only', '-n', String(config.windowCommits), commit])
  const blocks = namesOnly.split('\x1e').filter(Boolean)
  const commitsWithoutFiles = blocks.filter(block => block.split('\0').filter(Boolean).length <= 1).length

  // Training: same calls as the experiment runner.
  await git.raw(['checkout', '--detach', '-q', cutoff.hash])
  const history = await readGitHistory(repoPath, trainCount, undefined, maxFiles)
  const hotspot = await runHotspot(repoPath, history.churn, undefined, maxFiles)
  const universe = history.churn.map(file => file.path)
  const universeSet = new Set(universe)
  const scores = new Map(hotspot.items.map(item => [item.path, item.hotspotScore]))
  const ranked = [...universe].sort((a, b) => (scores.get(b) ?? 0) - (scores.get(a) ?? 0) || a.localeCompare(b))
  const predictedCount = Math.min(universe.length, Math.ceil(config.topFraction * universe.length))
  const predicted = new Set(ranked.slice(0, predictedCount))

  // Evaluation: bug-fix commits of the newest period.
  await git.raw(['checkout', '--detach', '-q', commit])
  const evaluation = await runCommitReader(repoPath, evaluationCount)
  const fixCommits = evaluation.commitLog.filter(c => BUG_FIX_PATTERN.test(c.message))
  const truth = new Set<string>()
  const fixCommitsByPath = new Map<string, number>()
  let fixChanges = 0
  let fixChangesInP = 0
  for (const c of fixCommits) {
    for (const path of new Set(c.files.map(f => f.path))) {
      if (!universeSet.has(path)) continue
      truth.add(path)
      fixCommitsByPath.set(path, (fixCommitsByPath.get(path) ?? 0) + 1)
      fixChanges++
      if (predicted.has(path)) fixChangesInP++
    }
  }

  const predictedFiles = [...predicted]
  const testInP = predictedFiles.filter(isTestFile)
  const otherInP = predictedFiles.filter(path => !isTestFile(path))
  const share = (files: string[]) => files.length === 0 ? NaN : files.filter(path => truth.has(path)).length / files.length
  const extensionOf = (path: string) => extname(path).toLowerCase() || '(none)'
  const topDirectories = top(predictedFiles.map(path => path.split('/').slice(0, 2).join('/')), 5)

  return {
    name, commit,
    window: { commits: window.length, bugFixCommits: bugFixCommitsInWindow, bugFixShare: bugFixCommitsInWindow / window.length,
      commitsWithoutFiles, commitsWithoutFilesShare: commitsWithoutFiles / window.length, firstWords,
      start: window[0].date, cutoff: cutoff.date, end: window[window.length - 1].date, trainCount, evaluationCount },
    universe: { n: universe.length, b: truth.size, truncated: history.filesTruncated, predicted: predictedCount, truePositive: predictedFiles.filter(p => truth.has(p)).length },
    auc: calculateAuc(scores, truth),
    bugFixChanges: { total: fixChanges, inPredicted: fixChangesInP, share: fixChanges === 0 ? NaN : fixChangesInP / fixChanges },
    testFiles: {
      shareInPredicted: testInP.length / predictedCount,
      shareInAll: universe.filter(isTestFile).length / universe.length,
      bugShareAmongPredictedTests: share(testInP), bugShareAmongOtherPredicted: share(otherInP),
    },
    topExtensionsInPredicted: top(predictedFiles.map(extensionOf), 5),
    topDirectoriesInPredicted: topDirectories,
    underSrcVsInPredicted: predictedFiles.filter(path => path.startsWith('src/vs/')).length,
    topFiles: ranked.slice(0, 10).map(path => ({
      path, fixCommits: fixCommitsByPath.get(path) ?? 0, churn: history.churn.find(file => file.path === path)?.churnCount ?? 0, score: scores.get(path) ?? 0, bugAssociated: truth.has(path),
    })),
  }
}

export async function main(args = process.argv.slice(2)): Promise<void> {
  const configIndex = args.indexOf('--config')
  if (configIndex < 0 || !args[configIndex + 1]) throw new Error('Usage: pnpm --filter @wot-git/api experiment:extras -- --config experiment.config.json')
  const configPath = resolve(args[configIndex + 1])
  const config = JSON.parse(await readFile(configPath, 'utf8')) as ExperimentConfig
  const cacheDir = resolve(process.env.WOTGIT_EXPERIMENT_CACHE ?? join(homedir(), '.cache', 'wot-git-experiment'))
  const { createHash } = await import('node:crypto')
  const slug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  const results = []
  for (const repo of config.repos) {
    const repoPath = join(cacheDir, `${slug(repo.name)}-${createHash('sha256').update(repo.url).digest('hex').slice(0, 12)}`)
    results.push(await analyse(repo.name, repoPath, repo.commit, config))
  }
  const outputDir = join(resolve(configPath, '..'), 'experiment-results')
  await mkdir(outputDir, { recursive: true })
  await writeFile(join(outputDir, 'extras.json'), `${JSON.stringify(results, null, 2)}\n`)
  console.log(`Wrote ${join(outputDir, 'extras.json')}`)
}

if (require.main === module) {
  main().catch(error => {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  })
}
