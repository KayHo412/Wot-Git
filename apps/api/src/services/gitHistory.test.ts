import assert from 'node:assert/strict'
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { simpleGit } from 'simple-git'
import { afterEach, describe, it } from 'node:test'
import { calculateCoChange, readGitHistory } from './gitHistory'
import { runCommitReader } from './commitReader'

const tempPaths: string[] = []

async function makeRepo(): Promise<string> {
  const repoPath = await mkdtemp(join(tmpdir(), 'wot-git-history-test-'))
  tempPaths.push(repoPath)
  const git = simpleGit(repoPath)
  await git.init()
  await git.addConfig('user.name', 'Wot Git Test')
  await git.addConfig('user.email', 'test@example.invalid')
  return repoPath
}

afterEach(async () => {
  await Promise.all(tempPaths.splice(0).map(path => rm(path, { recursive: true, force: true })))
})

describe('readGitHistory', () => {
  it('preserves spaces, tabs, and newlines in Git paths', async () => {
    const repoPath = await makeRepo()
    const files = ['src/space name.ts', 'src/tab\tname.ts', 'src/line\nbreak.ts']
    await Promise.all(files.map(async path => {
      await mkdir(join(repoPath, 'src'), { recursive: true })
      await writeFile(join(repoPath, path), 'one\n')
    }))
    const git = simpleGit(repoPath)
    await git.add(['--all'])
    await git.commit('add tracked files')
    await writeFile(join(repoPath, files[0]), 'two\n')
    await writeFile(join(repoPath, files[1]), 'two\n')
    await git.add(['--all'])
    await git.commit('change related files')

    const result = await readGitHistory(repoPath, 10)
    assert.equal(result.historyTruncated, false)
    assert.equal(result.filesTruncated, false)
    for (const path of files) assert.equal(result.churn.some(file => file.path === path), true)
    assert.equal(result.churn.find(file => file.path === files[0])?.churnCount, 2)
    assert.deepEqual((await calculateCoChange(result.commits)).items, [
      { fileA: files[0], fileB: files[1], count: 2 },
    ])
    const commitReader = await runCommitReader(repoPath, 10)
    const changed = commitReader.commitLog.find(commit => commit.message === 'change related files')
    assert.deepEqual(changed?.files.map(file => file.path).sort(), [...files.slice(0, 2)].sort())
  })

  it('limits history and labels the result truncated', async () => {
    const repoPath = await makeRepo()
    const filePath = join(repoPath, 'source.ts')
    await writeFile(filePath, '0\n')
    const git = simpleGit(repoPath)
    await git.add(['--all'])
    await git.commit('initial')
    for (let i = 1; i < 4; i++) {
      await writeFile(filePath, `${i}\n`)
      await git.add(['--all'])
      await git.commit(`change ${i}`)
    }
    const result = await readGitHistory(repoPath, 2)
    assert.equal(result.commitsAnalyzed, 2)
    assert.equal(result.historyTruncated, true)
  })
})
