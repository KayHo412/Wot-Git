import { lstat, readFile } from 'fs/promises'
import { isAbsolute, relative, resolve } from 'path'
import { simpleGit } from 'simple-git'

export interface RepositoryOverview {
  readmePath: string | null
  readmeTitle: string | null
  readmeSummary: string | null
}

const README_MAX_BYTES = 256 * 1024

function toPlainText(value: string): string {
  return value
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/<[^>]*>/g, ' ')
    .replace(/[`*_~>#]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function readmeText(markdown: string): { title: string | null; summary: string | null } {
  const lines = markdown.replace(/^\uFEFF/, '').split(/\r?\n/)
  const headingIndex = lines.findIndex(line => /^#\s+\S/.test(line.trim()))
  const title = headingIndex >= 0 ? toPlainText(lines[headingIndex].trim().replace(/^#\s+/, '')) : null

  let paragraph: string[] = []
  let inParagraph = false
  for (let index = headingIndex >= 0 ? headingIndex + 1 : 0; index < lines.length; index++) {
    const line = lines[index].trim()
    if (!line) {
      if (inParagraph) break
      continue
    }
    if (/^(```|~~~|!\[|\[!|<picture|<p\b|<a\b|<img\b|<div\b)/i.test(line)) continue
    if (/^(#{1,6}\s|[-*+]\s|\d+\.\s|\|)/.test(line)) {
      if (inParagraph) break
      continue
    }
    paragraph.push(line)
    inParagraph = true
    if (paragraph.join(' ').length >= 500) break
  }
  const summary = toPlainText(paragraph.join(' ')).slice(0, 500).trim() || null
  return { title: title || null, summary }
}

export async function readRepositoryOverview(repoPath: string): Promise<RepositoryOverview> {
  const git = simpleGit(repoPath)
  const paths = (await git.raw(['ls-tree', '-r', '--name-only', 'HEAD']))
    .split('\n')
    .filter(Boolean)
  const readmePath = paths.find(path => /^README(?:\.[^/]*)?$/i.test(path.split('/').pop() ?? '')) ?? null
  if (!readmePath) return { readmePath: null, readmeTitle: null, readmeSummary: null }

  try {
    const fullPath = resolve(repoPath, readmePath)
    const fromRepo = relative(resolve(repoPath), fullPath)
    if (!fromRepo || fromRepo === '..' || fromRepo.startsWith(`..${process.platform === 'win32' ? '\\' : '/'}`) || isAbsolute(fromRepo)) {
      return { readmePath, readmeTitle: null, readmeSummary: null }
    }
    const info = await lstat(fullPath)
    if (!info.isFile() || info.isSymbolicLink() || info.size > README_MAX_BYTES) {
      return { readmePath, readmeTitle: null, readmeSummary: null }
    }
    const content = await readFile(fullPath, 'utf8')
    const extracted = readmeText(content)
    return { readmePath, readmeTitle: extracted.title, readmeSummary: extracted.summary }
  } catch {
    return { readmePath, readmeTitle: null, readmeSummary: null }
  }
}
