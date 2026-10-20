import { stat } from 'fs/promises'
import { join } from 'path'
import type { FileChurn, Hotspot } from '@wot-git/types'
import { ANALYSIS_MAX_FILES } from '../config/limits'
import { throwIfAborted } from '../utils/scan'

function normalize(values: number[]): number[] {
  const min = Math.min(...values)
  const max = Math.max(...values)
  if (max === min) return values.map(() => 0.5)
  return values.map(v => (v - min) / (max - min))
}

export function calculateHotspotScores(churn: FileChurn[], sizes: number[]): Hotspot[] {
  if (!churn.length) return []
  const normalizedChurn = normalize(churn.map(file => file.churnCount))
  const normalizedSize = normalize(sizes)
  return churn.map((file, i) => ({
    path: file.path,
    churnScore: Number(normalizedChurn[i].toFixed(4)),
    sizeScore: Number(normalizedSize[i].toFixed(4)),
    hotspotScore: Number(((normalizedChurn[i] + normalizedSize[i]) / 2).toFixed(4)),
  })).sort((a, b) => b.hotspotScore - a.hotspotScore || a.path.localeCompare(b.path))
}

export async function runHotspot(repoPath: string, churn: FileChurn[], signal?: AbortSignal): Promise<{ items: Hotspot[]; filesTruncated: boolean }> {
  if (churn.length === 0) return { items: [], filesTruncated: false }

  // Bound concurrent filesystem operations while measuring the selected file set.
  const sizes: number[] = []
  for (let offset = 0; offset < churn.length; offset += 64) {
    throwIfAborted(signal)
    const batch = churn.slice(offset, offset + 64)
    const values = await Promise.all(batch.map(async ({ path }) => {
      try {
        const s = await stat(join(repoPath, path))
        return s.size
      } catch {
        return 0
      }
    }))
    sizes.push(...values)
  }
  throwIfAborted(signal)

  const items = calculateHotspotScores(churn, sizes)
  return { items, filesTruncated: churn.length > ANALYSIS_MAX_FILES }
}
