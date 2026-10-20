import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import type { FileChurn } from '@wot-git/types'
import { parseCommitSizes } from './commits'
import { calculateHotspotScores } from './hotspot'

describe('parseCommitSizes', () => {
  it('parses insertion and deletion totals, including one-sided changes', () => {
    const result = parseCommitSizes([
      'COMMIT_START\naaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa\n2026-01-01\n',
      '20\t2\tsrc/changed\nname.ts',
      '3\t-\tsrc/binary.bin',
      'COMMIT_START\nbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb\n2026-01-02\n',
      '-\t12\tsrc/removed.ts',
    ].join('\0'))
    assert.deepEqual(result, [
      { hash: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', date: '2026-01-01', insertions: 23, deletions: 2 },
      { hash: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb', date: '2026-01-02', insertions: 0, deletions: 12 },
    ])
  })
})

describe('calculateHotspotScores', () => {
  it('keeps normalized equal dimensions at 0.5 and sorts ties deterministically', () => {
    const churn: FileChurn[] = [
      { path: 'z.ts', churnCount: 4, lastTouched: '2026-01-01' },
      { path: 'a.ts', churnCount: 4, lastTouched: '2026-01-01' },
    ]
    assert.deepEqual(calculateHotspotScores(churn, [10, 10]), [
      { path: 'a.ts', churnScore: 0.5, sizeScore: 0.5, hotspotScore: 0.5 },
      { path: 'z.ts', churnScore: 0.5, sizeScore: 0.5, hotspotScore: 0.5 },
    ])
  })

  it('averages normalized churn and size without changing the current formula', () => {
    const churn: FileChurn[] = [
      { path: 'a.ts', churnCount: 1, lastTouched: '2026-01-01' },
      { path: 'b.ts', churnCount: 3, lastTouched: '2026-01-01' },
    ]
    assert.deepEqual(calculateHotspotScores(churn, [100, 300]), [
      { path: 'b.ts', churnScore: 1, sizeScore: 1, hotspotScore: 1 },
      { path: 'a.ts', churnScore: 0, sizeScore: 0, hotspotScore: 0 },
    ])
  })
})
