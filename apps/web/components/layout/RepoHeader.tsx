import Link from "next/link"
import { ExternalLink, ArrowLeft } from "lucide-react"
import { formatDate } from "@/lib/utils"

interface RepoHeaderProps {
  owner: string
  repo: string
  analyzedAt: string
  totalCommits: number
  totalFiles: number
}
export function RepoHeader({ owner, repo, analyzedAt, totalCommits, totalFiles }: RepoHeaderProps) {
  const githubUrl = `https://github.com/${owner}/${repo}`
  return (
    <header className="h-[57px] flex items-center justify-between gap-3 px-3 sm:px-6 border-b border-border bg-bg sticky top-0 z-10">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-1.5 text-xs text-muted hover:text-primary transition-colors mr-3 pr-3 border-r border-border"
          title="Back to search"
        >
          <ArrowLeft size={13} />
          <span>Search</span>
        </Link>
        <div className="flex min-w-0 items-center gap-1">
          <span className="min-w-0 max-w-[5rem] truncate text-sm text-muted sm:max-w-[10rem] lg:max-w-none">{owner}</span>
          <span className="shrink-0 text-border">/</span>
          <span className="min-w-0 max-w-[6rem] truncate text-sm font-semibold text-primary sm:max-w-[14rem] lg:max-w-none">{repo}</span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="text-xs text-border">·</span>
          <span className="text-xs text-muted">{totalCommits.toLocaleString()} commits</span>
          <span className="text-xs text-border">·</span>
          <span className="text-xs text-muted">{totalFiles.toLocaleString()} files</span>
          <span className="hidden text-xs text-border md:inline">·</span>
          <span className="hidden text-xs text-muted md:inline">analyzed {formatDate(analyzedAt)}</span>
        </div>
      </div>
      <a
        href={githubUrl}
        target="_blank"
        rel="noreferrer"
        className="flex shrink-0 items-center gap-1.5 text-xs text-muted hover:text-primary transition-colors"
      >
        GitHub <ExternalLink size={12} />
      </a>
    </header>
  )
}
