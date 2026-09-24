"use client"
import { useEffect, useState } from "react"
import { useAnalysis } from "@/hooks/useAnalysis"
import { Sidebar, TABS, type TabId } from "@/components/layout/Sidebar"
import { RepoHeader } from "@/components/layout/RepoHeader"
import { OverviewBar } from "@/components/panels/OverviewBar"
import { HotspotChart } from "@/components/panels/HotspotChart"
import { BugFilesTable } from "@/components/panels/BugFilesTable"
import { CommitActivity } from "@/components/panels/CommitActivity"
import { CommitSizes } from "@/components/panels/CommitSizes"
import { ChurnTable } from "@/components/panels/ChurnTable"
import { CommitLog } from "@/components/panels/CommitLog"
import { OwnershipTable } from "@/components/panels/OwnershipTable"
import { CoChangeTable } from "@/components/panels/CoChangeTable"
import { OutlineTree } from "@/components/panels/OutlineTree"
import { ErrorState } from "@/components/shared/ErrorState"
import { Skeleton } from "@/components/ui/skeleton"

export default function DashboardPage({
  params,
}: {
  params: { owner: string; repo: string }
}) {
  const { owner, repo } = params
  const { data, isLoading, isError, error, refetch } = useAnalysis(owner, repo)
  const [activeTab, setActiveTab] = useState<TabId>("hotspots")

  useEffect(() => {
    document.body.style.overflow = isLoading ? "hidden" : ""

    return () => {
      document.body.style.overflow = ""
    }
  }, [isLoading])

  if (isLoading) {
    return (
      <div className="flex min-h-screen">
        <Sidebar activeTab={activeTab} onSelectTab={setActiveTab} />
        <div className="flex-1 flex flex-col">
          <header className="h-[57px] flex items-center justify-between px-6 border-b border-border bg-bg sticky top-0">
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-24" />
              <span className="text-border">/</span>
              <Skeleton className="h-4 w-32" />
            </div>
            <Skeleton className="h-4 w-16" />
          </header>
          <main className="flex-1 p-6 space-y-6 max-w-7xl w-full mx-auto">
            <div className="flex items-center gap-3 p-4 rounded-md border border-accent/20 bg-accent/5 text-xs text-accent">
              <div className="w-2 h-2 rounded-full bg-accent animate-ping" />
              Cloning repository and executing analytical pipelines... this may take 30–60s on first run.
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
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

  if (isError || !data) {
    const errCode = (error as any)?.code
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <ErrorState
          code={errCode}
          message={error?.message}
          onRetry={() => refetch()}
        />
      </div>
    )
  }

  const totalCommits = data.commits.reduce((sum, c) => sum + c.count, 0)
  const totalFiles = data.churn.length
  const totalBugFixCommits = data.commitLog.filter((c) => c.isBugFix).length

  return (
    <div className="flex min-h-screen bg-bg">
      <Sidebar activeTab={activeTab} onSelectTab={setActiveTab} />
      <div className="flex-1 flex flex-col min-w-0">
        <RepoHeader
          owner={owner}
          repo={repo}
          analyzedAt={data.analyzedAt}
          totalCommits={totalCommits}
          totalFiles={totalFiles}
        />
        <nav
          aria-label="Analysis sections"
          className="sticky top-[57px] z-10 flex gap-1 overflow-x-auto border-b border-border bg-bg px-3 py-2 lg:hidden"
        >
          {TABS.map(({ id, label, icon: Icon }) => {
            const isActive = activeTab === id
            return (
              <button
                key={id}
                type="button"
                onClick={() => setActiveTab(id)}
                className={`flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs transition-colors ${
                  isActive
                    ? "bg-accent/15 text-accent font-semibold"
                    : "text-muted hover:bg-surface hover:text-primary"
                }`}
              >
                <Icon size={13} />
                <span>{label}</span>
              </button>
            )
          })}
        </nav>
        <main className="flex-1 p-6 space-y-6 max-w-7xl w-full mx-auto">
          {/* OverviewBar stays permanently visible at the top */}
          <OverviewBar data={data} />

          {/* Active Tab Panel */}
          {activeTab === "hotspots" && <HotspotChart data={data.hotspots} />}
          {activeTab === "bugfiles" && (
            <BugFilesTable
              data={data.bugFiles}
              totalBugFixCommits={totalBugFixCommits}
              owner={owner}
              repo={repo}
            />
          )}
          {activeTab === "commits" && <CommitActivity data={data.commits} />}
          {activeTab === "commitsizes" && (
            <CommitSizes
              data={data.commitSizes}
              commitLog={data.commitLog}
              owner={owner}
              repo={repo}
            />
          )}
          {activeTab === "churn" && <ChurnTable data={data.churn} />}
          {activeTab === "commitlog" && (
            <CommitLog data={data.commitLog} owner={owner} repo={repo} />
          )}
          {activeTab === "ownership" && <OwnershipTable data={data.ownership} />}
          {activeTab === "cochange" && <CoChangeTable data={data.cochange} />}
          {activeTab === "outline" && <OutlineTree data={data.outline} />}
        </main>
      </div>
    </div>
  )
}
