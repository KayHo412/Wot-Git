import { cn } from "@/lib/utils"
import { shortenHash } from "@/lib/utils"

interface HashBadgeProps {
  hash: string
  owner?: string
  repo?: string
  className?: string
}

export function HashBadge({ hash, owner, repo, className }: HashBadgeProps) {
  const short = shortenHash(hash)
  const href = owner && repo ? `https://github.com/${owner}/${repo}/commit/${hash}` : undefined
  const cls = cn(
    "font-mono text-xs text-accent bg-accent/10 border border-accent/20 rounded-sm px-1.5 py-0.5",
    "hover:bg-accent/20 transition-colors",
    className
  )
  if (href) {
    return <a href={href} target="_blank" rel="noreferrer" className={cls}>{short}</a>
  }
  return <span className={cls}>{short}</span>
}
