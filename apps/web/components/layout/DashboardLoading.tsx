import type { ReactNode } from "react"
import { Sidebar, type TabId } from "@/components/layout/Sidebar"
import { Skeleton } from "@/components/ui/skeleton"

interface DashboardLoadingProps {
  activeTab: TabId
  mobileNav: ReactNode
  onSelectTab: (tab: TabId) => void
}

export function DashboardLoading({ activeTab, mobileNav, onSelectTab }: DashboardLoadingProps) {
  return (
    <div className="flex min-h-screen bg-bg" aria-busy="true">
      <Sidebar activeTab={activeTab} onSelectTab={onSelectTab} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 flex h-[57px] items-center justify-between border-b border-border bg-bg px-6">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-24" />
            <span className="text-border">/</span>
            <Skeleton className="h-4 w-32" />
          </div>
          <Skeleton className="h-4 w-16" />
        </header>
        {mobileNav}
        <main className="mx-auto w-full max-w-7xl flex-1 space-y-6 p-6">
          <div className="flex items-center gap-3 rounded-md border border-accent/20 bg-accent/5 p-4 text-xs text-accent" role="status" aria-live="polite">
            <div className="h-2 w-2 animate-ping rounded-full bg-accent" aria-hidden="true" />
            Preparing repository analysis... first-time scans may take up to 60 seconds.
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
