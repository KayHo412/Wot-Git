import assert from 'node:assert/strict'
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { simpleGit } from 'simple-git'
import { calculateRankingMetrics, runExperiment, selectBugFiles } from './run'

test('ranking metrics apply ceil top fraction and alphabetical score ties', () => {
  const metrics = calculateRankingMetrics(['z.ts', 'b.ts', 'a.ts'], new Set(['b.ts']), new Map([['a.ts', 0.5], ['b.ts', 0.5], ['z.ts', 0.1]]), 0.34, 0.5)
  assert.equal(metrics.n, 3)
  assert.equal(metrics.predicted, 2)
  assert.equal(metrics.truePositive, 1)
  assert.equal(metrics.precision, 0.5)
  assert.equal(metrics.recall, 1)
  assert.equal(metrics.f1, 2 / 3)
  assert.equal(metrics.baselineF1, (2 * ((1 / 3) * 0.34)) / ((1 / 3) + 0.34))
  assert.equal(metrics.lift, 1.5)
})

test('bug-file ground truth deduplicates paths within a commit and counts matched commits', () => {
  const result = selectBugFiles([
    { message: 'Fix parser', files: [{ path: 'a.ts', insertions: 1, deletions: 0 }, { path: 'a.ts', insertions: 1, deletions: 0 }, { path: 'outside.ts', insertions: 1, deletions: 0 }] },
    { message: 'Fixed parser', files: [{ path: 'a.ts', insertions: 1, deletions: 0 }, { path: 'b.ts', insertions: 1, deletions: 0 }] },
    { message: 'Refactor', files: [{ path: 'b.ts', insertions: 1, deletions: 0 }] },
  ], new Set(['a.ts', 'b.ts']), /\bfix(?:e[sd]|ing)?\b/i, 2)
  assert.deepEqual([...result.files], ['a.ts'])
  assert.equal(result.matchedCommitCount, 2)
})

test('whole experiment runner works against a tiny synthetic Git repository', async () => {
  const root = await mkdtemp(join(tmpdir(), 'wot-experiment-test-'))
  const source = join(root, 'source')
  const cacheDir = join(root, 'cache')
  const outputDir = join(root, 'results')
  await mkdir(join(source, 'src'), { recursive: true })
  try {
    const git = simpleGit(source)
    await git.init()
    await git.addConfig('user.name', 'Experiment Test')
    await git.addConfig('user.email', 'experiment@example.test')
    await writeFile(join(source, 'src/a.ts'), 'export const value = 1\n')
    await writeFile(join(source, 'src/b.ts'), 'export const value = 2\n')
    await git.add(['src/a.ts', 'src/b.ts'])
    await git.commit('Initial files')
    await writeFile(join(source, 'src/a.ts'), 'export const value = 3\n')
    await git.add('src/a.ts')
    await git.commit('Refine parser')
    await writeFile(join(source, 'src/a.ts'), 'export const value = 4\n')
    await git.add('src/a.ts')
    await git.commit('Fix parser regression')
    await writeFile(join(source, 'src/b.ts'), 'export const value = 5\n')
    await git.add('src/b.ts')
    await git.commit('Update example')
    const pinnedCommit = (await git.revparse(['HEAD'])).trim()

    const result = await runExperiment({
      repos: [{ name: 'fixture/tiny', url: source, commit: pinnedCommit }],
      windowCommits: 4,
      trainFraction: 0.5,
      topFraction: 0.5,
      minFixCommits: [1, 2],
    }, { cacheDir, outputDir })

    assert.equal(result.repositories[0].error, undefined)
    assert.equal(result.repositories[0].resolvedCommit, pinnedCommit)
    assert.equal(result.repositories[0].trainCount, 2)
    assert.equal(result.repositories[0].evaluationCount, 2)
    assert.equal(result.repositories[0].filesInUniverse, 2)
    assert.equal(result.repositories[0].rows?.length, 16)
    const defaultSingleFix = result.repositories[0].rows?.find(row => row.pattern === 'default' && row.minFixCommits === 1 && row.variant === 'mean')
    assert.equal(defaultSingleFix?.b, 1)
    assert.equal(defaultSingleFix?.skipped, false)
    const twiceFix = result.repositories[0].rows?.find(row => row.pattern === 'default' && row.minFixCommits === 2 && row.variant === 'mean')
    assert.equal(twiceFix?.skipped, true)
    assert.match(await readFile(join(outputDir, 'results.csv'), 'utf8'), /"fixture\/tiny","default","1","mean"/)
    assert.match(await readFile(join(outputDir, 'top20-fixture-tiny.csv'), 'utf8'), /src\/a\.ts/)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})
