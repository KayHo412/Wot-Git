"use client"
import { useCallback, useEffect, useState } from "react"
import type { DashboardStreamMessage } from "@wot-git/types"
import { useDashboard } from "@/hooks/useDashboard"
import { Sidebar, NAV_GROUPS, groupForTab, type TabId } from "@/components/layout/Sidebar"
import { RepoHeader } from "@/components/layout/RepoHeader"
import { DashboardLoading, type DashboardProgressState } from "@/components/layout/DashboardLoading"
import { RepositoryOverview } from "@/components/panels/RepositoryOverview"
import { HotspotChart } from "@/components/panels/HotspotChart"
import { BugFilesTable } from "@/components/panels/BugFilesTable"
import { CommitActivity } from "@/components/panels/CommitActivity"
import { CommitSizes } from "@/components/panels/CommitSizes"
import { ChurnTable } from "@/components/panels/ChurnTable"
import { CommitLog } from "@/components/panels/CommitLog"
import { OwnershipTable } from "@/components/panels/OwnershipTable"
import { CoChangeTable } from "@/components/panels/CoChangeTable"
import { OutlineTree } from "@/components/panels/OutlineTree"
import { RepoHealthPanel } from "@/components/panels/RepoHealthPanel"
import { ErrorState } from "@/components/shared/ErrorState"
import { ChevronDown } from "lucide-react"
import { ProjectGuide } from "@/components/guide/ProjectGuide"

function MobileAnalysisNav({ activeTab, onSelectTab, isOpen }: { activeTab: TabId; onSelectTab: (tab: TabId) => void; isOpen: boolean }) {
  const [expandedGroup, setExpandedGroup] = useState(() => groupForTab(activeTab))

  useEffect(() => setExpandedGroup(groupForTab(activeTab)), [activeTab])

  return (
    <nav id="mobile-analysis-nav" aria-label="Analysis sections" hidden={!isOpen} className="sticky top-[57px] z-10 border-b border-border bg-bg py-2 lg:hidden">
      <div className="flex flex-wrap gap-1 px-3">
        {NAV_GROUPS.map(({ id, label, icon: Icon, items }) => {
          const isActiveGroup = items.some(item => item.id === activeTab)
          const isExpanded = expandedGroup === id
          return (
            <button
              key={id}
              type="button"
              aria-expanded={isExpanded}
              aria-controls={isExpanded ? `mobile-group-${id}` : undefined}
              onClick={() => setExpandedGroup(current => current === id ? "" : id)}
              className={`flex shrink-0 items-center gap-1 rounded-md px-2.5 py-1.5 text-xs transition-colors ${isActiveGroup ? "bg-accent/15 text-accent font-semibold" : "text-muted hover:bg-surface hover:text-primary"}`}
            >
              <Icon size={13} />
              <span>{label}</span>
              <ChevronDown size={12} className={`transition-transform ${isExpanded ? "rotate-180" : ""}`} />
            </button>
          )
        })}
      </div>
      {NAV_GROUPS.map(({ id, items }) => expandedGroup === id && (
        <div id={`mobile-group-${id}`} key={id} className="mt-2 flex flex-wrap gap-1 px-3">
          {items.map(({ id: itemId, label, icon: Icon }) => {
            const isActive = activeTab === itemId
            return (
              <button
                key={itemId}
                type="button"
                aria-current={isActive ? "page" : undefined}
                onClick={() => onSelectTab(itemId)}
                className={`flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs transition-colors ${isActive ? "bg-accent/15 text-accent font-semibold" : "text-muted hover:bg-surface hover:text-primary"}`}
              >
                <Icon size={13} />
                <span>{label}</span>
              </button>
            )
          })}
        </div>
      ))}
    </nav>
  )
}

export default function DashboardPage({
  params,
}: {
  params: { owner: string; repo: string }
}) {
  const { owner, repo } = params
  const [progress, setProgress] = useState<DashboardProgressState>({ cacheHit: false, phases: { clone: "running" } })
  const [navigationOpen, setNavigationOpen] = useState(true)
  const toggleNavigation = useCallback(() => setNavigationOpen(open => !open), [])
  const handleProgress = useCallback((message: DashboardStreamMessage) => {
    if (message.type === "cache") {
      setProgress({ cacheHit: true, phases: {} })
    } else if (message.type === "stage") {
      setProgress(current => ({
        cacheHit: false,
        phases: { ...current.phases, [message.phase]: message.status },
      }))
    }
  }, [])
  const { data, isLoading, isError, error, refetch } = useDashboard(owner, repo, handleProgress)
  const [activeTab, setActiveTab] = useState<TabId>("overview")
  const isViewLoading = isLoading

  const retryDashboard = useCallback(() => {
    setProgress({ cacheHit: false, phases: { clone: "running" } })
    void refetch()
  }, [refetch])

  useEffect(() => {
    document.body.style.overflow = isViewLoading ? "hidden" : ""

    return () => {
      document.body.style.overflow = ""
    }
  }, [isViewLoading])

  if (isViewLoading) {
    return (
      <DashboardLoading
        activeTab={activeTab}
        mobileNav={<MobileAnalysisNav activeTab={activeTab} onSelectTab={setActiveTab} isOpen={navigationOpen} />}
        onSelectTab={setActiveTab}
        progress={progress}
        navigationOpen={navigationOpen}
        onToggleNavigation={toggleNavigation}
      />
    )
  }

  if (isError || !data) {
    const errCode = (error as any)?.code
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <ErrorState code={errCode} message={error?.message} onRetry={retryDashboard} />
      </div>
    )
  }

  if (activeTab === "health") {
    return (
      <div className="flex min-h-screen bg-bg">
        <Sidebar activeTab={activeTab} onSelectTab={setActiveTab} isOpen={navigationOpen} />
        <div className="flex min-w-0 flex-1 flex-col">
          <RepoHeader owner={owner} repo={repo} navigationOpen={navigationOpen} onToggleNavigation={toggleNavigation} />
          <MobileAnalysisNav activeTab={activeTab} onSelectTab={setActiveTab} isOpen={navigationOpen} />
          <main className="mx-auto w-full max-w-7xl flex-1 space-y-6 p-6">
            <RepoHealthPanel
              data={data.health}
              isError={false}
              error={null}
              onRetry={() => refetch()}
              owner={owner}
              repo={repo}
            />
          </main>
        </div>
      </div>
    )
  }

  if (activeTab === "guide") {
    return (
      <div className="flex min-h-screen bg-bg">
        <Sidebar activeTab={activeTab} onSelectTab={setActiveTab} isOpen={navigationOpen} />
        <div className="flex min-w-0 flex-1 flex-col">
          <RepoHeader owner={owner} repo={repo} navigationOpen={navigationOpen} onToggleNavigation={toggleNavigation} />
          <MobileAnalysisNav activeTab={activeTab} onSelectTab={setActiveTab} isOpen={navigationOpen} />
          <main className="mx-auto w-full max-w-7xl flex-1 space-y-6 p-6">
            <ProjectGuide />
          </main>
        </div>
      </div>
    )
  }

  const analysis = data.analysis
  const totalBugFixCommits = analysis.commitLog.filter((c) => c.isBugFix).length

  return (
    <div className="flex min-h-screen bg-bg">
      <Sidebar activeTab={activeTab} onSelectTab={setActiveTab} isOpen={navigationOpen} />
      <div className="flex-1 flex flex-col min-w-0">
        <RepoHeader
          owner={owner}
          repo={repo}
          navigationOpen={navigationOpen}
          onToggleNavigation={toggleNavigation}
          analyzedAt={analysis.analyzedAt}
          totalCommits={analysis.commits.reduce((sum, c) => sum + c.count, 0)}
          totalFiles={analysis.churn.length}
        />
        <MobileAnalysisNav activeTab={activeTab} onSelectTab={setActiveTab} isOpen={navigationOpen} />
        <main className="flex-1 p-6 space-y-6 max-w-7xl w-full mx-auto">
          {/* Active Tab Panel */}
          {activeTab === "overview" && <RepositoryOverview data={data} onSelectTab={setActiveTab} />}
          {activeTab === "hotspots" && <HotspotChart data={analysis.hotspots} />}
          {activeTab === "bugfiles" && (
            <BugFilesTable
              data={analysis.bugFiles}
              totalBugFixCommits={totalBugFixCommits}
              owner={owner}
              repo={repo}
            />
          )}
          {activeTab === "commits" && <CommitActivity data={analysis.commits} />}
          {activeTab === "commitsizes" && (
            <CommitSizes
              data={analysis.commitSizes}
              commitLog={analysis.commitLog}
              owner={owner}
              repo={repo}
            />
          )}
          {activeTab === "churn" && <ChurnTable data={analysis.churn} />}
          {activeTab === "commitlog" && (
            <CommitLog data={analysis.commitLog} owner={owner} repo={repo} />
          )}
          {activeTab === "ownership" && <OwnershipTable data={analysis.ownership} />}
          {activeTab === "cochange" && <CoChangeTable data={analysis.cochange} />}
          {activeTab === "outline" && <OutlineTree data={analysis.outline} />}
        </main>
      </div>
    </div>
  )
}
