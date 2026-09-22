import { stat } from 'fs/promises'
import { join } from 'path'
import type { FileChurn, Hotspot } from '@wot-git/types'

function normalize(values: number[]): number[] {
  const min = Math.min(...values)
  const max = Math.max(...values)
  if (max === min) return values.map(() => 0.5)
  return values.map(v => (v - min) / (max - min))
}

export async function runHotspot(repoPath: string, churn: FileChurn[]): Promise<Hotspot[]> {
  if (churn.length === 0) return []

  // Get file sizes
  const sizes = await Promise.all(
    churn.map(async ({ path }) => {
      try {
        const s = await stat(join(repoPath, path))
        return s.size
      } catch {
        return 0
      }
    })
  )

  const churnCounts = churn.map(f => f.churnCount)
  const normalizedChurn = normalize(churnCounts)
  const normalizedSize = normalize(sizes)

  return churn.map((file, i) => ({
    path: file.path,
    churnScore: parseFloat(normalizedChurn[i].toFixed(4)),
    sizeScore: parseFloat(normalizedSize[i].toFixed(4)),
    hotspotScore: parseFloat(((normalizedChurn[i] + normalizedSize[i]) / 2).toFixed(4)),
  })).sort((a, b) => b.hotspotScore - a.hotspotScore)
}
