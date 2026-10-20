import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { FileChurn } from '@wot-git/types'
import { calculateHotspotScores } from '../src/services/hotspot'
import { isBugFixMessage } from '../src/utils/bugFix'

interface Fixture {
  description: string
  commits: Array<{ subject: string; files: string[]; isBugFix: boolean }>
  files: Array<{ path: string; size: number; bugAssociated: boolean; highRisk: boolean }>
}

function scores(predicted: Set<string>, expected: Set<string>) {
  const truePositive = [...predicted].filter(path => expected.has(path)).length
  const precision = predicted.size ? truePositive / predicted.size : 0
  const recall = expected.size ? truePositive / expected.size : 0
  const f1 = precision + recall ? (2 * precision * recall) / (precision + recall) : 0
  return { precision, recall, f1 }
}

async function main() {
  const fixture = JSON.parse(await readFile(join(__dirname, 'fixtures/history-signals.json'), 'utf8')) as Fixture
  const predictedBugFiles = new Set(fixture.commits.filter(commit => isBugFixMessage(commit.subject)).flatMap(commit => commit.files))
  const expectedBugFiles = new Set(fixture.files.filter(file => file.bugAssociated).map(file => file.path))
  const bugMetrics = scores(predictedBugFiles, expectedBugFiles)
  const churn: FileChurn[] = fixture.files.map(file => ({
    path: file.path,
    churnCount: fixture.commits.filter(commit => commit.files.includes(file.path)).length,
    lastTouched: 'fixture',
  }))
  const ranked = calculateHotspotScores(churn, fixture.files.map(file => file.size)).map(item => item.path)
  const topExpected = new Set(fixture.files.filter(file => file.highRisk).map(file => file.path))
  const topK = Math.max(1, topExpected.size)
  const topActual = new Set(ranked.slice(0, topK))
  const hotspotMetrics = scores(topActual, topExpected)
  const correctCommitLabels = fixture.commits.filter(commit => isBugFixMessage(commit.subject) === commit.isBugFix).length
  const commitLabelAccuracy = fixture.commits.length ? correctCommitLabels / fixture.commits.length : 0

  console.log('Offline fixture benchmark — results apply only to this labeled fixture.')
  console.log(fixture.description)
  console.log(`Commit keyword accuracy: ${commitLabelAccuracy.toFixed(3)} (${correctCommitLabels}/${fixture.commits.length})`)
  console.log(`Bug-associated files: precision ${bugMetrics.precision.toFixed(3)}, recall ${bugMetrics.recall.toFixed(3)}, F1 ${bugMetrics.f1.toFixed(3)}`)
  console.log(`Hotspots: precision@${topK} ${hotspotMetrics.precision.toFixed(3)}, recall@${topK} ${hotspotMetrics.recall.toFixed(3)}`)
  console.log(`Top ${topK}: ${ranked.slice(0, topK).join(', ')}`)
  console.log(`Labeled high-risk files: ${[...topExpected].join(', ')}`)
}

void main()
