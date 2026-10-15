"use client"
import { useState, type ReactNode } from "react"

const INLINE_TOKEN = /(`[^`]+`|!\[[^\]]*\]\([^\s)]+(?:\s+[^)]*)?\)|\[[^\]]+\]\([^\s)]+(?:\s+[^)]*)?\)|\*\*[^*]+\*\*|__[^_]+__|~~[^~]+~~|\*[^*\n]+\*|_[^_\n]+_)/g

function safeHref(value: string): boolean {
  return /^(https?:\/\/|mailto:|#|\.\.?\/)/i.test(value) || (value.startsWith("/") && !value.startsWith("//"))
}

function tableCells(line: string): string[] {
  return line.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map(cell => cell.trim().replace(/\\\|/g, "|"))
}

function resolveImageSource(source: string, baseUrl: string | null): string | null {
  try {
    const url = baseUrl ? new URL(source, baseUrl) : new URL(source)
    return url.protocol === "https:" ? url.toString() : null
  } catch {
    return null
  }
}

function ReadmeImage({ source, alt, baseUrl }: { source: string; alt: string; baseUrl: string | null }) {
  const [failed, setFailed] = useState(false)
  const resolved = resolveImageSource(source, baseUrl)
  if (!resolved || failed) return <span className="text-xs text-muted">[Image: {alt || "repository image"}]</span>
  return <img src={resolved} alt={alt} loading="lazy" referrerPolicy="no-referrer" onError={() => setFailed(true)} className="my-3 max-h-[32rem] max-w-full rounded-md object-contain" />
}

function inlineMarkdown(value: string, keyPrefix: string, imageBaseUrl: string | null): ReactNode[] {
  const parts = value.split(INLINE_TOKEN)
  return parts.map((part, index) => {
    const key = `${keyPrefix}-${index}`
    if (!part) return null
    if (part.startsWith("`") && part.endsWith("`")) {
      return <code key={key} className="rounded bg-bg px-1 py-0.5 font-mono text-[0.9em] text-accent">{part.slice(1, -1)}</code>
    }
    const image = part.match(/^!\[([^\]]*)\]\(([^\s)]+)(?:\s+[^)]*)?\)$/)
    if (image) {
      const [, alt, src] = image
      return <ReadmeImage key={key} source={src} alt={alt} baseUrl={imageBaseUrl} />
    }
    const link = part.match(/^\[([^\]]+)\]\(([^\s)]+)(?:\s+[^)]*)?\)$/)
    if (link) {
      const [, label, href] = link
      if (!safeHref(href)) return <span key={key}>{label}</span>
      const external = /^https?:\/\//i.test(href)
      return <a key={key} href={href} target={external ? "_blank" : undefined} rel={external ? "noreferrer" : undefined} className="text-accent underline decoration-accent/40 underline-offset-2 hover:text-primary">{label}</a>
    }
    if ((part.startsWith("**") && part.endsWith("**")) || (part.startsWith("__") && part.endsWith("__"))) {
      return <strong key={key} className="font-semibold text-primary">{inlineMarkdown(part.slice(2, -2), key, imageBaseUrl)}</strong>
    }
    if (part.startsWith("~~") && part.endsWith("~~")) return <del key={key}>{part.slice(2, -2)}</del>
    if ((part.startsWith("*") && part.endsWith("*")) || (part.startsWith("_") && part.endsWith("_"))) {
      return <em key={key}>{part.slice(1, -1)}</em>
    }
    return <span key={key}>{part}</span>
  })
}

function preprocessMarkdown(content: string): string {
  const lines = content.replace(/^\uFEFF/, "").split(/\r?\n/)
  let fence: string | null = null
  let insideComment = false
  return lines.map(line => {
    const trimmed = line.trim()
    if (fence) {
      if (trimmed.startsWith(fence)) fence = null
      return line
    }
    const fenceStart = trimmed.match(/^(```|~~~)/)
    if (fenceStart) {
      fence = fenceStart[1]
      return line
    }

    const codeSpans: string[] = []
    let cleaned = line.replace(/(`+[^`]+`+)/g, code => {
      const marker = `WOTGITCODESPAN${codeSpans.length}TOKEN`
      codeSpans.push(code)
      return marker
    })

    let withoutComments = ""
    for (let index = 0; index < cleaned.length;) {
      if (insideComment) {
        const end = cleaned.indexOf("-->", index)
        if (end === -1) break
        insideComment = false
        index = end + 3
      } else {
        const start = cleaned.indexOf("<!--", index)
        if (start === -1) {
          withoutComments += cleaned.slice(index)
          break
        }
        withoutComments += cleaned.slice(index, start)
        insideComment = true
        index = start + 4
      }
    }

    cleaned = withoutComments
      .replace(/<img\b([^>]*)\/?>/gi, (_tag, attributes: string) => {
        const readAttribute = (name: string) => attributes.match(new RegExp("\\b" + name + "\\s*=\\s*(?:\"([^\"]*)\"|'([^']*)'|([^\\s\"'=<>\\x60]+))", "i"))?.slice(1).find(Boolean) ?? ""
        const src = readAttribute("src")
        const alt = readAttribute("alt").replace(/[\[\]]/g, "")
        return src ? `![${alt}](${src})` : ""
      })
      .replace(/<br\s*\/?>/gi, " ")
      .replace(/<[^>]*>/g, "")

    for (const [index, code] of codeSpans.entries()) cleaned = cleaned.replace(`WOTGITCODESPAN${index}TOKEN`, code)
    return cleaned
  }).join("\n")
}

function isBlockStart(lines: string[], index: number): boolean {
  const line = lines[index]?.trim() ?? ""
  return !line || /^(```|~~~|#{1,6}\s|>\s?|[-*_]\s*[-*_]\s*[-*_]|(?:[-+*]|\d+[.)])\s+)/.test(line)
}

export function SafeMarkdown({ content, imageBaseUrl = null }: { content: string; imageBaseUrl?: string | null }) {
  const lines = preprocessMarkdown(content).split(/\r?\n/)
  const blocks: ReactNode[] = []
  let index = 0

  while (index < lines.length) {
    const line = lines[index].trim()
    if (!line) { index++; continue }

    const fence = line.match(/^(```|~~~)(.*)$/)
    if (fence) {
      const marker = fence[1]
      const language = fence[2].trim().split(/\s+/)[0]
      const codeLines: string[] = []
      index++
      while (index < lines.length && !lines[index].trim().startsWith(marker)) codeLines.push(lines[index++])
      if (index < lines.length) index++
      blocks.push(<pre key={`block-${blocks.length}`} className="overflow-x-auto rounded-md border border-border bg-bg p-4 text-xs leading-5"><code className={language ? `language-${language}` : undefined}>{codeLines.join("\n")}</code></pre>)
      continue
    }

    const heading = line.match(/^(#{1,6})\s+(.+?)\s*#*$/)
    if (heading) {
      const level = heading[1].length
      const className = level <= 2 ? "text-lg font-semibold text-primary" : "text-base font-semibold text-primary"
      const children = inlineMarkdown(heading[2], `heading-${blocks.length}`, imageBaseUrl)
      blocks.push(level === 1
        ? <h1 key={`block-${blocks.length}`} className={className}>{children}</h1>
        : level === 2
          ? <h2 key={`block-${blocks.length}`} className={className}>{children}</h2>
          : <h3 key={`block-${blocks.length}`} className={className}>{children}</h3>)
      index++
      continue
    }

    if (/^([-*_])(?:\s*\1){2,}\s*$/.test(line)) {
      blocks.push(<hr key={`block-${blocks.length}`} className="border-border" />)
      index++
      continue
    }

    if (line.includes("|") && index + 1 < lines.length && /^\s*\|?\s*:?-{3,}:?\s*(?:\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(lines[index + 1])) {
      const headers = tableCells(line)
      index += 2
      const rows: string[][] = []
      while (index < lines.length && lines[index].includes("|") && lines[index].trim()) rows.push(tableCells(lines[index++]))
      blocks.push(
        <div key={`block-${blocks.length}`} className="overflow-x-auto rounded-md border border-border">
          <table className="w-full border-collapse text-left text-xs">
            <thead className="bg-bg text-primary"><tr>{headers.map((cell, cellIndex) => <th key={cellIndex} className="border-b border-border px-3 py-2 font-semibold">{inlineMarkdown(cell, `table-head-${blocks.length}-${cellIndex}`, imageBaseUrl)}</th>)}</tr></thead>
            <tbody>{rows.map((row, rowIndex) => <tr key={rowIndex} className="border-b border-border last:border-0">{headers.map((_, cellIndex) => <td key={cellIndex} className="px-3 py-2 align-top text-muted">{inlineMarkdown(row[cellIndex] ?? "", `table-cell-${blocks.length}-${rowIndex}-${cellIndex}`, imageBaseUrl)}</td>)}</tr>)}</tbody>
          </table>
        </div>
      )
      continue
    }

    if (/^>\s?/.test(line)) {
      const quote: string[] = []
      while (index < lines.length && /^>\s?/.test(lines[index].trim())) quote.push(lines[index++].trim().replace(/^>\s?/, ""))
      blocks.push(<blockquote key={`block-${blocks.length}`} className="border-l-2 border-accent/50 pl-4 text-muted">{quote.map((text, quoteIndex) => <p key={quoteIndex}>{inlineMarkdown(text, `quote-${blocks.length}-${quoteIndex}`, imageBaseUrl)}</p>)}</blockquote>)
      continue
    }

    const listItem = line.match(/^([-+*]|\d+[.)])\s+(.+)$/)
    if (listItem) {
      const ordered = /^\d/.test(listItem[1])
      const items: string[] = []
      while (index < lines.length) {
        const item = lines[index].trim().match(/^([-+*]|\d+[.)])\s+(.+)$/)
        if (!item || /^\d/.test(item[1]) !== ordered) break
        items.push(item[2])
        index++
      }
      const List = ordered ? "ol" : "ul"
      blocks.push(<List key={`block-${blocks.length}`} className={ordered ? "list-decimal space-y-1 pl-6" : "list-disc space-y-1 pl-6"}>{items.map((item, itemIndex) => <li key={itemIndex}>{inlineMarkdown(item, `list-${blocks.length}-${itemIndex}`, imageBaseUrl)}</li>)}</List>)
      continue
    }

    const paragraph: string[] = []
    while (index < lines.length && !isBlockStart(lines, index)) paragraph.push(lines[index++].trim())
    if (paragraph.length === 0 && index < lines.length) paragraph.push(lines[index++].trim())
    blocks.push(<p key={`block-${blocks.length}`} className="leading-6 text-muted">{inlineMarkdown(paragraph.join(" "), `paragraph-${blocks.length}`, imageBaseUrl)}</p>)
  }

  return <div className="space-y-4 break-words">{blocks}</div>
}
