import assert from 'node:assert/strict'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { simpleGit } from 'simple-git'
import { afterEach, describe, it } from 'node:test'
import { runAnalysis } from './analysis'

const tempPaths: string[] = []

afterEach(async () => {
  await Promise.all(tempPaths.splice(0).map(path => rm(path, { recursive: true, force: true })))
})

describe('runAnalysis', () => {
  it('builds all file signals from the same bounded recent-history window', async () => {
    const repoPath = await mkdtemp(join(tmpdir(), 'wot-git-analysis-test-'))
    tempPaths.push(repoPath)
    const git = simpleGit(repoPath)
    await git.init()
    await git.addConfig('user.name', 'Wot Git Test')
    await git.addConfig('user.email', 'test@example.invalid')
    const filePath = join(repoPath, 'src/service.ts')
    await mkdir(join(repoPath, 'src'), { recursive: true })
    await writeFile(filePath, 'export const service = 1\n')
    await git.add(['--all'])
    await git.commit('add service')
    await writeFile(filePath, 'export const service = 2\n')
    await git.add(['--all'])
    await git.commit('fix service crash')

    const result = await runAnalysis(repoPath, 'https://github.com/example/service')
    assert.equal(result.scan.commitsAnalyzed, 2)
    assert.equal(result.scan.historyTruncated, false)
    assert.equal(result.scan.filesTruncated, false)
    assert.equal(result.churn.find(file => file.path === 'src/service.ts')?.churnCount, 2)
    assert.equal(result.commitLog.length, 2)
    assert.equal(result.commitLog.find(commit => commit.message === 'fix service crash')?.isBugFix, true)
    assert.equal(result.commitLog.find(commit => commit.message === 'fix service crash')?.matchedBugFixKeyword, 'fix')
    assert.equal(result.commitLog.find(commit => commit.message === 'add service')?.matchedBugFixKeyword, null)
    assert.equal(result.bugFiles.find(file => file.path === 'src/service.ts')?.bugFixCount, 1)
    assert.equal(result.ownership.find(file => file.path === 'src/service.ts')?.authors.length, 1)
    assert.equal(result.commitSizes.length, 2)
    assert.equal(result.commitSizes.find(commit => commit.insertions > 0)?.insertions, 1)
  })
})
