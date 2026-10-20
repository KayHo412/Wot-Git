import Link from "next/link"
import { ExternalLink, ArrowLeft, RefreshCw } from "lucide-react"
import { formatDate } from "@/lib/utils"
import { NavigationToggle } from "@/components/layout/NavigationToggle"

interface RepoHeaderProps {
  owner: string
  repo: string
  analyzedAt?: string
  totalCommits?: number
  totalFiles?: number
  navigationOpen: boolean
  onToggleNavigation: () => void
  onRefresh?: () => void
}
export function RepoHeader({ owner, repo, analyzedAt, totalCommits, totalFiles, navigationOpen, onToggleNavigation, onRefresh }: RepoHeaderProps) {
  const githubUrl = `https://github.com/${owner}/${repo}`
  const hasAnalysisStats = totalCommits !== undefined && totalFiles !== undefined
  return (
    <header className="h-[57px] flex items-center justify-between gap-3 px-3 sm:px-6 border-b border-border bg-bg sticky top-0 z-10">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <NavigationToggle isOpen={navigationOpen} onToggle={onToggleNavigation} />
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
        {hasAnalysisStats && (
          <div className="flex shrink-0 items-center gap-2">
            <span className="text-xs text-border">·</span>
            <span className="text-xs text-muted">{totalCommits.toLocaleString()} commits</span>
            <span className="text-xs text-border">·</span>
            <span className="text-xs text-muted">{totalFiles.toLocaleString()} files</span>
            {analyzedAt && <>
              <span className="hidden text-xs text-border md:inline">·</span>
              <span className="hidden text-xs text-muted md:inline">analyzed {formatDate(analyzedAt)}</span>
            </>}
          </div>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-3">
        {onRefresh && <button type="button" onClick={onRefresh} aria-label="Refresh repository analysis and bypass cache" title="Refresh repository analysis and bypass cache" className="flex h-8 items-center justify-center gap-1.5 border border-border px-2 text-xs text-muted hover:bg-surface hover:text-primary focus-visible:outline focus-visible:outline-1 focus-visible:outline-accent">
          <RefreshCw size={14} /><span className="hidden sm:inline">Refresh</span>
        </button>}
        <a
          href={githubUrl}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1.5 text-xs text-muted hover:text-primary"
        >
          GitHub <ExternalLink size={12} />
        </a>
      </div>
    </header>
  )
}
