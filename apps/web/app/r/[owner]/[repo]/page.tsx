"use client"
import { useCallback, useEffect, useRef, useState } from "react"
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
import { FileEvidencePanel } from "@/components/panels/FileEvidencePanel"
import { ScanCoverageNotice } from "@/components/panels/ScanCoverageNotice"
import type { GuideSectionId } from "@/components/guide/guideTypes"

function MobileAnalysisNav({ activeTab, onSelectTab, isOpen }: { activeTab: TabId; onSelectTab: (tab: TabId) => void; isOpen: boolean }) {
  const [expandedGroup, setExpandedGroup] = useState(() => groupForTab(activeTab))
  const activeTopLevelRef = useRef<HTMLButtonElement>(null)

  useEffect(() => setExpandedGroup(groupForTab(activeTab)), [activeTab])
  useEffect(() => {
    activeTopLevelRef.current?.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "auto" })
  }, [activeTab])

  return (
    <nav id="mobile-analysis-nav" aria-label="Analysis sections" hidden={!isOpen} className="sticky top-[57px] z-10 border-b border-border bg-bg py-2 lg:hidden">
      <div className="w-full min-w-0 overflow-x-auto overscroll-x-contain">
        <div className="flex w-max min-w-full flex-nowrap gap-1 px-3">
          {NAV_GROUPS.map(({ id, label, icon: Icon, items }) => {
          const isActiveGroup = items.some(item => item.id === activeTab)
          const isExpanded = expandedGroup === id
          if (items.length === 1) {
            const item = items[0]
            const ItemIcon = item.icon
            const isActive = activeTab === item.id
            return <button
              key={id}
              ref={isActiveGroup ? activeTopLevelRef : undefined}
              type="button"
              aria-current={isActive ? "page" : undefined}
              onClick={() => onSelectTab(item.id)}
              className={`flex shrink-0 items-center gap-1.5 border px-2.5 py-1.5 text-xs focus-visible:outline focus-visible:outline-1 focus-visible:outline-accent ${isActive ? "border-accent/50 bg-accent/10 text-accent font-semibold" : "border-transparent text-muted hover:border-border hover:bg-surface hover:text-primary"}`}
            >
              <ItemIcon size={13} />
              <span>{item.label}</span>
            </button>
          }
          return (
            <button
              key={id}
              ref={isActiveGroup ? activeTopLevelRef : undefined}
              type="button"
              aria-expanded={isExpanded}
              aria-controls={isExpanded ? `mobile-group-${id}` : undefined}
              onClick={() => setExpandedGroup(current => current === id ? "" : id)}
              className={`flex shrink-0 items-center gap-1 border px-2.5 py-1.5 text-xs focus-visible:outline focus-visible:outline-1 focus-visible:outline-accent ${isActiveGroup ? "border-accent/50 bg-accent/10 text-accent font-semibold" : "border-transparent text-muted hover:border-border hover:bg-surface hover:text-primary"}`}
            >
              <Icon size={13} />
              <span>{label}</span>
              <ChevronDown size={12} className={isExpanded ? "rotate-180" : ""} />
            </button>
          )
          })}
        </div>
      </div>
      {NAV_GROUPS.filter(({ items }) => items.length > 1).map(({ id, items }) => expandedGroup === id && (
        <div id={`mobile-group-${id}`} key={id} className="mt-2 flex flex-wrap gap-1 px-3">
          {items.map(({ id: itemId, label, icon: Icon }) => {
            const isActive = activeTab === itemId
            return (
              <button
                key={itemId}
                type="button"
                aria-current={isActive ? "page" : undefined}
                onClick={() => onSelectTab(itemId)}
                className={`flex shrink-0 items-center gap-1.5 border px-2.5 py-1.5 text-xs focus-visible:outline focus-visible:outline-1 focus-visible:outline-accent ${isActive ? "border-accent/50 bg-accent/10 text-accent font-semibold" : "border-transparent text-muted hover:border-border hover:bg-surface hover:text-primary"}`}
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
  const [refreshKey, setRefreshKey] = useState(0)
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const [guideSection, setGuideSection] = useState<GuideSectionId>("how-to-read")
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
  const { data, isLoading, isError, error, refetch } = useDashboard(owner, repo, handleProgress, refreshKey)
  const [activeTab, setActiveTab] = useState<TabId>("overview")
  const isViewLoading = isLoading

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" })
  }, [activeTab])

  const retryDashboard = useCallback(() => {
    window.scrollTo(0, 0)
    setProgress({ cacheHit: false, phases: { clone: "running" } })
    void refetch()
  }, [refetch])
  const refreshDashboard = useCallback(() => {
    window.scrollTo(0, 0)
    setSelectedFile(null)
    setProgress({ cacheHit: false, phases: { clone: "running" } })
    setRefreshKey(key => key + 1)
  }, [])
  const openGuide = useCallback((section: GuideSectionId) => {
    setGuideSection(section)
    setActiveTab("guide")
  }, [])

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
          <RepoHeader owner={owner} repo={repo} navigationOpen={navigationOpen} onToggleNavigation={toggleNavigation} onRefresh={refreshDashboard} />
          <MobileAnalysisNav activeTab={activeTab} onSelectTab={setActiveTab} isOpen={navigationOpen} />
          <main className="mx-auto w-full max-w-7xl flex-1 space-y-6 p-6">
            <ScanCoverageNotice analysis={data.analysis} health={data.health} onOpenGuide={openGuide} />
            <RepoHealthPanel
              data={data.health}
              isError={false}
              error={null}
              onRetry={refreshDashboard}
              owner={owner}
              repo={repo}
              onOpenGuide={openGuide}
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
          <RepoHeader owner={owner} repo={repo} navigationOpen={navigationOpen} onToggleNavigation={toggleNavigation} onRefresh={refreshDashboard} />
          <MobileAnalysisNav activeTab={activeTab} onSelectTab={setActiveTab} isOpen={navigationOpen} />
          <main className="mx-auto w-full max-w-7xl flex-1 space-y-6 p-6">
            <ProjectGuide initialSection={guideSection} onSectionChange={setGuideSection} />
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
          onRefresh={refreshDashboard}
          analyzedAt={analysis.analyzedAt}
          totalCommits={analysis.commits.reduce((sum, c) => sum + c.count, 0)}
          totalFiles={analysis.churn.length}
        />
        <MobileAnalysisNav activeTab={activeTab} onSelectTab={setActiveTab} isOpen={navigationOpen} />
        <main className="flex-1 p-6 space-y-6 max-w-7xl w-full mx-auto">
          <ScanCoverageNotice analysis={analysis} health={data.health} onOpenGuide={openGuide} />
          {selectedFile && <FileEvidencePanel path={selectedFile} analysis={analysis} onClose={() => setSelectedFile(null)} onInspect={setSelectedFile} onSelectTab={setActiveTab} onOpenGuide={openGuide} />}
          {/* Active Tab Panel */}
          {activeTab === "overview" && <RepositoryOverview data={data} onSelectTab={setActiveTab} onOpenGuide={openGuide} />}
          {activeTab === "hotspots" && <HotspotChart data={analysis.hotspots} onInspect={setSelectedFile} selectedFile={selectedFile} onOpenGuide={openGuide} />}
          {activeTab === "bugfiles" && (
            <BugFilesTable
              data={analysis.bugFiles}
              totalBugFixCommits={totalBugFixCommits}
              owner={owner}
              repo={repo}
              onInspect={setSelectedFile}
              selectedFile={selectedFile}
              onOpenGuide={openGuide}
            />
          )}
          {activeTab === "commits" && <CommitActivity data={analysis.commits} onOpenGuide={openGuide} />}
          {activeTab === "commitsizes" && (
            <CommitSizes
              data={analysis.commitSizes}
              commitLog={analysis.commitLog}
              owner={owner}
              repo={repo}
              onOpenGuide={openGuide}
            />
          )}
          {activeTab === "churn" && <ChurnTable data={analysis.churn} onInspect={setSelectedFile} selectedFile={selectedFile} onOpenGuide={openGuide} />}
          {activeTab === "commitlog" && (
            <CommitLog data={analysis.commitLog} owner={owner} repo={repo} onOpenGuide={openGuide} />
          )}
          {activeTab === "ownership" && <OwnershipTable data={analysis.ownership} onInspect={setSelectedFile} selectedFile={selectedFile} onOpenGuide={openGuide} />}
          {activeTab === "cochange" && <CoChangeTable data={analysis.cochange} onInspect={setSelectedFile} selectedFile={selectedFile} onOpenGuide={openGuide} />}
          {activeTab === "outline" && <OutlineTree data={analysis.outline} onInspect={setSelectedFile} selectedFile={selectedFile} onOpenGuide={openGuide} />}
        </main>
      </div>
    </div>
  )
}
