import Link from "next/link"
import { ExternalLink, ArrowLeft } from "lucide-react"
import { formatDate } from "@/lib/utils"

interface RepoHeaderProps {
  owner: string
  repo: string
  analyzedAt: string
  totalCommits: number
}

export function RepoHeader({ owner, repo, analyzedAt, totalCommits }: RepoHeaderProps) {
  const githubUrl = `https://github.com/${owner}/${repo}`
  return (
    <header className="h-[57px] flex items-center justify-between px-6 border-b border-border bg-bg sticky top-0 z-10">
      <div className="flex items-center gap-2">
        <Link
          href="/"
          className="flex items-center gap-1.5 text-xs text-muted hover:text-primary transition-colors mr-3 pr-3 border-r border-border"
          title="Back to search"
        >
          <ArrowLeft size={13} />
          <span>Search</span>
        </Link>
        <span className="text-muted text-sm">{owner}</span>
        <span className="text-border">/</span>
        <span className="text-sm font-semibold text-primary">{repo}</span>
        <span className="text-xs text-border ml-2">·</span>
        <span className="text-xs text-muted">{totalCommits.toLocaleString()} commits</span>
        <span className="text-xs text-border">·</span>
        <span className="text-xs text-muted">analyzed {formatDate(analyzedAt)}</span>
      </div>
      <a
        href={githubUrl}
        target="_blank"
        rel="noreferrer"
        className="flex items-center gap-1.5 text-xs text-muted hover:text-primary transition-colors"
      >
        GitHub <ExternalLink size={12} />
      </a>
    </header>
  )
}
