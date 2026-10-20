import { readdir, readFile, stat } from 'fs/promises'
import { join, extname, relative } from 'path'
import type { FileOutline } from '@wot-git/types'
import { isExcludedDirectory, isExcludedFile } from '../utils/fileFilter'
import { throwIfAborted } from '../utils/scan'

const SUPPORTED_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.py', '.java', '.cs', '.go'])
const MAX_FILE_SIZE = 500 * 1024 // 500KB — skip huge files
const MAX_FILES = 300

const PATTERNS: Record<string, Array<{ regex: RegExp; type: 'function' | 'class' }>> = {
  '.ts': jsPatterns(),
  '.tsx': jsPatterns(),
  '.js': jsPatterns(),
  '.jsx': jsPatterns(),
  '.py': [
    { regex: /^(?:async\s+)?def\s+(\w+)\s*\(/m, type: 'function' },
    { regex: /^class\s+(\w+)/m, type: 'class' },
  ],
  '.java': [
    { regex: /(?:public|private|protected|static|\s)+[\w<>\[\]]+\s+(\w+)\s*\(/m, type: 'function' },
    { regex: /(?:public|private|protected)?\s*class\s+(\w+)/m, type: 'class' },
  ],
  '.cs': [
    { regex: /(?:public|private|protected|internal|static|\s)+[\w<>\[\]]+\s+(\w+)\s*\(/m, type: 'function' },
    { regex: /(?:public|private|protected)?\s*class\s+(\w+)/m, type: 'class' },
  ],
  '.go': [
    { regex: /^func\s+(?:\(\w+\s+\*?\w+\)\s+)?(\w+)\s*\(/m, type: 'function' },
  ],
}

function jsPatterns() {
  return [
    { regex: /^(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\(/m, type: 'function' as const },
    { regex: /^(?:export\s+)?const\s+(\w+)\s*=\s*(?:async\s+)?\(.*?\)\s*=>/m, type: 'function' as const },
    { regex: /^(?:export\s+)?class\s+(\w+)/m, type: 'class' as const },
  ]
}

function extractOutline(content: string, ext: string): FileOutline[] {
  const patterns = PATTERNS[ext]
  if (!patterns) return []

  const lines = content.split('\n')
  const results: FileOutline[] = []

  lines.forEach((line, idx) => {
    for (const { regex, type } of patterns) {
      const match = line.match(regex)
      if (match?.[1]) {
        results.push({ name: match[1], type, line: idx + 1 })
        break
      }
    }
  })

  return results
}

async function collectFiles(dir: string, baseDir: string, signal?: AbortSignal): Promise<{ files: string[]; truncated: boolean }> {
  const files: string[] = []
  let truncated = false
  const pending = [dir]

  while (pending.length) {
    throwIfAborted(signal)
    const current = pending.pop()!
    const entries = (await readdir(current, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))
    for (const entry of entries) {
      if (entry.isDirectory() && isExcludedDirectory(entry.name)) continue
      const fullPath = join(current, entry.name)
      if (entry.isDirectory()) pending.push(fullPath)
      else if (SUPPORTED_EXTENSIONS.has(extname(entry.name)) && !isExcludedFile(relative(baseDir, fullPath))) {
        if (files.length < MAX_FILES) files.push(fullPath)
        else truncated = true
      }
    }
  }
  return { files: files.sort((a, b) => a.localeCompare(b)), truncated }
}

export async function runOutline(repoPath: string, signal?: AbortSignal): Promise<{ items: Record<string, FileOutline[]>; truncated: boolean; fileLimit: number }> {
  const result: Record<string, FileOutline[]> = {}

  try {
    const collected = await collectFiles(repoPath, repoPath, signal)

    await Promise.all(
      collected.files.map(async (filePath) => {
        try {
          throwIfAborted(signal)
          const s = await stat(filePath)
          if (s.size > MAX_FILE_SIZE) return

          const content = await readFile(filePath, 'utf-8')
          const ext = extname(filePath)
          const outline = extractOutline(content, ext)

          if (outline.length > 0) {
            const relativePath = relative(repoPath, filePath)
            result[relativePath] = outline
          }
        } catch {
          throwIfAborted(signal)
        }
      })
    )
    return { items: result, truncated: collected.truncated, fileLimit: MAX_FILES }
  } catch {
    throwIfAborted(signal)
    // Best-effort; return empty if anything goes wrong.
  }

  return { items: result, truncated: false, fileLimit: MAX_FILES }
}
