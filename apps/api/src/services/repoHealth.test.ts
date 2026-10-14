import { afterEach, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, mkdir, rm, symlink, writeFile } from 'fs/promises'
import { tmpdir } from 'os'
import { basename, join } from 'path'
import { execFileSync } from 'child_process'
import { runRepoHealth } from './repoHealth'
import { readRepositoryOverview } from './repositoryOverview'

const temporaryRepos: string[] = []
const temporaryFiles: string[] = []

afterEach(async () => {
  await Promise.all(temporaryRepos.splice(0).map(path => rm(path, { recursive: true, force: true })))
  await Promise.all(temporaryFiles.splice(0).map(path => rm(path, { force: true })))
})

async function createRepo(): Promise<string> {
  const repoPath = await mkdtemp(join(tmpdir(), 'wot-health-test-'))
  temporaryRepos.push(repoPath)
  execFileSync('git', ['init', '-q', repoPath])
  execFileSync('git', ['-C', repoPath, 'config', 'user.name', 'Wot Health Test'])
  execFileSync('git', ['-C', repoPath, 'config', 'user.email', 'health-test@example.invalid'])
  return repoPath
}

async function commit(repoPath: string, files: Record<string, string>, message: string, date: string) {
  for (const [path, content] of Object.entries(files)) {
    const fullPath = join(repoPath, path)
    await mkdir(join(fullPath, '..'), { recursive: true })
    await writeFile(fullPath, content)
  }
  execFileSync('git', ['-C', repoPath, 'add', '-A'])
  execFileSync('git', ['-C', repoPath, 'commit', '-q', '-m', message], {
    env: {
      ...process.env,
      GIT_AUTHOR_DATE: `${date}T12:00:00+00:00`,
      GIT_COMMITTER_DATE: `${date}T12:00:00+00:00`,
    },
  })
}

describe('runRepoHealth', () => {
  it('detects static health signals and redacts possible credentials', async () => {
    const repoPath = await createRepo()
    const testToken = ['sk_live_', '123456789012345678901234'].join('')
    await commit(repoPath, {
      'package.json': JSON.stringify({ name: 'sample-service', scripts: { start: 'node app.js', test: 'vitest' }, dependencies: { express: '^4' } }),
      'README.md': '# Sample service\n',
      'docs/operations.md': '# Operations\n',
      'tests/app.test.ts': 'describe("app", () => {})\n',
      'vitest.config.ts': 'export default {}\n',
      '.github/workflows/ci.yml': 'name: ci\n',
      'Dockerfile': 'FROM node:20\n',
      '.env': 'APP_MODE=production\n',
      'src/config.ts': `const token = "${testToken}"\n`,
    }, 'initial project', '2024-01-15')

    const result = await runRepoHealth(repoPath, 'https://github.com/example/sample')
    assert.equal(result.projectType, 'application')
    assert.equal(result.timeline.length, 1)
    assert.equal(result.historyCommitLimit, 20_000)
    assert.equal(result.historyCommitsAnalyzed, 1)
    assert.equal(result.historyTruncated, false)
    assert.equal(result.timeline[0].hasReadme, true)
    assert.equal(result.timeline[0].hasTests, true)
    assert.equal(result.timeline[0].hasCi, true)
    assert.equal(result.timeline[0].hasDocker, true)
    assert.ok(result.findings.some(finding => finding.id === 'env-tracked'))
    assert.ok(result.findings.some(finding => finding.category === 'security' && finding.title === 'Possible exposed credential'))
    assert.ok(!JSON.stringify(result).includes(testToken))
    assert.ok(result.categories.every(category => category.score !== null))
  })

  it('reconstructs monthly file checks and marks deployment not applicable for libraries', async () => {
    const repoPath = await createRepo()
    await commit(repoPath, {
      'package.json': JSON.stringify({ name: 'sample-library', main: 'index.js' }),
      'index.js': 'module.exports = 1\n',
    }, 'initial library', '2024-01-10')
    await commit(repoPath, {
      'README.md': '# Library\n',
      'tests/index.test.js': 'test("library", () => {})\n',
      '.github/workflows/test.yml': 'name: test\n',
    }, 'add docs tests and ci', '2024-02-10')

    const result = await runRepoHealth(repoPath, 'https://github.com/example/library')
    assert.equal(result.projectType, 'library')
    assert.equal(result.timeline.length, 2)
    assert.equal(result.timeline[0].hasReadme, false)
    assert.equal(result.timeline[1].hasReadme, true)
    assert.equal(result.timeline[1].hasTests, true)
    assert.equal(result.timeline[1].hasCi, true)
    assert.equal(result.categories.find(category => category.id === 'deployment')?.score, null)
    assert.equal(result.timelineTruncated, false)
  })

  it('does not follow tracked symlinks when scanning for secrets', async () => {
    const repoPath = await createRepo()
    const outsidePath = join(repoPath, '..', `${basename(repoPath)}-outside.ts`)
    temporaryFiles.push(outsidePath)
    const testToken = ['ghp_', 'abcdefghijklmnopqrstuvwxyz0123456789ABCDEFGH'].join('')
    await writeFile(outsidePath, `const token = "${testToken}"\n`)
    await mkdir(join(repoPath, 'src'), { recursive: true })
    await symlink(outsidePath, join(repoPath, 'src', 'linked-secret.ts'))
    await commit(repoPath, {
      'package.json': JSON.stringify({ name: 'sample-app', scripts: { start: 'node app.js' } }),
      'README.md': '# Sample\n',
    }, 'initial app', '2024-03-01')

    const result = await runRepoHealth(repoPath, 'https://github.com/example/safe-scan')
    assert.equal(result.findings.some(finding => finding.path === 'src/linked-secret.ts'), false)
    assert.equal(result.findings.some(finding => finding.title === 'Possible exposed credential'), false)
  })
})

describe('readRepositoryOverview', () => {
  it('extracts a README title and short introduction', async () => {
    const repoPath = await createRepo()
    await commit(repoPath, {
      'README.md': '# Sample project\n\n![Build](https://example.invalid/badge.svg)\n\nA compact tool for reviewing repository history and maintenance signals.\n\n## Install\n\nMore details.\n',
    }, 'add readme', '2024-04-01')

    const result = await readRepositoryOverview(repoPath)
    assert.equal(result.readmePath, 'README.md')
    assert.equal(result.readmeTitle, 'Sample project')
    assert.equal(result.readmeSummary, 'A compact tool for reviewing repository history and maintenance signals.')
  })

  it('reports missing README evidence without inventing a summary', async () => {
    const repoPath = await createRepo()
    await commit(repoPath, { 'src/main.ts': 'export const value = 1\n' }, 'initial source', '2024-04-02')

    assert.deepEqual(await readRepositoryOverview(repoPath), {
      readmePath: null,
      readmeTitle: null,
      readmeSummary: null,
    })
  })
})
