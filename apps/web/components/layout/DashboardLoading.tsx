import type { ReactNode } from "react"
import { CheckCircle2, Circle, Loader2 } from "lucide-react"
import type { DashboardPhase } from "@wot-git/types"
import { Sidebar, type TabId } from "@/components/layout/Sidebar"
import { NavigationToggle } from "@/components/layout/NavigationToggle"
import { Skeleton } from "@/components/ui/skeleton"

export interface DashboardProgressState {
  cacheHit: boolean
  phases: Partial<Record<DashboardPhase, "running" | "complete">>
}

interface DashboardLoadingProps {
  activeTab: TabId
  mobileNav: ReactNode
  onSelectTab: (tab: TabId) => void
  progress: DashboardProgressState
  navigationOpen: boolean
  onToggleNavigation: () => void
}

const PHASES: Array<{ id: DashboardPhase; label: string }> = [
  { id: "clone", label: "Clone repository" },
  { id: "analysis", label: "Analyze commit history and files" },
  { id: "health", label: "Calculate Health score and trends" },
  { id: "prepare", label: "Prepare repository overview" },
]

export function DashboardLoading({ activeTab, mobileNav, onSelectTab, progress, navigationOpen, onToggleNavigation }: DashboardLoadingProps) {
  return (
    <div className="flex min-h-screen bg-bg" aria-busy="true">
      <Sidebar activeTab={activeTab} onSelectTab={onSelectTab} isOpen={navigationOpen} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 flex h-[57px] items-center justify-between border-b border-border bg-bg px-6">
          <div className="flex items-center gap-2">
            <NavigationToggle isOpen={navigationOpen} onToggle={onToggleNavigation} />
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-24" />
              <span className="text-border">/</span>
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
          <Skeleton className="h-4 w-16" />
        </header>
        {mobileNav}
        <main className="mx-auto w-full max-w-7xl flex-1 space-y-6 p-6">
          <div className="border border-accent/20 bg-accent/5 p-4 text-xs text-accent" role="status" aria-live="polite">
            <div className="flex items-center gap-3 font-medium">
              <div className="h-2 w-2 bg-accent" aria-hidden="true" />
              {progress.cacheHit ? "Loading the cached repository report…" : "Preparing repository analysis…"}
            </div>
            {!progress.cacheHit && <ol className="mt-3 grid gap-2 sm:grid-cols-2">
              {PHASES.map(({ id, label }) => {
                const status = progress.phases[id]
                const Icon = status === "complete" ? CheckCircle2 : status === "running" ? Loader2 : Circle
                return <li key={id} className={`flex items-center gap-2 ${status ? "text-accent" : "text-muted"}`}>
                  <Icon size={14} aria-hidden="true" className={status === "running" ? "animate-spin" : ""} />
                  <span>{label}</span>
                  {id === "analysis" && progress.phases.analysis === "running" && progress.phases.health === "running" && <span className="text-[10px] text-muted">running with Health</span>}
                </li>
              })}
            </ol>}
          </div>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
          </div>
          <Skeleton className="h-[340px]" />
          <Skeleton className="h-[260px]" />
          <Skeleton className="h-[300px]" />
        </main>
      </div>
    </div>
  )
}
