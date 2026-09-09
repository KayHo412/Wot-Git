import { readdir, readFile, stat } from 'fs/promises'
import { join, extname, relative } from 'path'
import type { FileOutline } from '@repolens/types'

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

async function collectFiles(dir: string, baseDir: string, files: string[] = []): Promise<string[]> {
  if (files.length >= MAX_FILES) return files

  const entries = await readdir(dir, { withFileTypes: true })
  for (const entry of entries) {
    if (entry.name.startsWith('.') || entry.name === 'node_modules' || entry.name === 'dist') continue
    const fullPath = join(dir, entry.name)
    if (entry.isDirectory()) {
      await collectFiles(fullPath, baseDir, files)
    } else if (SUPPORTED_EXTENSIONS.has(extname(entry.name))) {
      files.push(fullPath)
    }
    if (files.length >= MAX_FILES) break
  }
  return files
}

export async function runOutline(repoPath: string): Promise<Record<string, FileOutline[]>> {
  const result: Record<string, FileOutline[]> = {}

  try {
    const files = await collectFiles(repoPath, repoPath)

    await Promise.all(
      files.map(async (filePath) => {
        try {
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
          // Skip unreadable files
        }
      })
    )
  } catch {
    // Best-effort; return empty if anything goes wrong
  }

  return result
}
