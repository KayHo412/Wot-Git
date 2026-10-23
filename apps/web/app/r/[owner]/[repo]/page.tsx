"use client"
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react"
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
import type { AnalysisResult } from "@wot-git/types"
import { ScanCoverageNotice } from "@/components/panels/ScanCoverageNotice"
import type { GuideSectionId } from "@/components/guide/guideTypes"
import { downloadText, filterCommits, matchesPath, markdownSummary, type DashboardFilters } from "@/lib/dashboardExploration"
import { ExportCsvButton } from "@/components/shared/ExportCsvButton"

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

function InspectionReopenControl({ path, onOpen }: { path: string | null; onOpen: () => void }) {
  if (!path) return null
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-2 text-xs">
      <span className="min-w-0 truncate text-muted">Inspection closed · <span className="font-mono text-primary">{path}</span></span>
      <button type="button" onClick={onOpen} className="shrink-0 border border-border px-2.5 py-1.5 text-accent hover:bg-surface focus-visible:outline focus-visible:outline-1 focus-visible:outline-accent">Open inspection</button>
    </div>
  )
}

function useMobileInspectionDrawer() {
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const query = window.matchMedia("(max-width: 1279px)")
    const update = () => setIsMobile(query.matches)
    update()
    query.addEventListener("change", update)
    return () => query.removeEventListener("change", update)
  }, [])
  return isMobile
}

function DashboardContent({
  children,
  path,
  isOpen,
  analysis,
  startDate,
  endDate,
  pathFilter,
  onClose,
  onInspect,
  onSelectTab,
  onOpenGuide,
}: {
  children: ReactNode
  path: string | null
  isOpen: boolean
  analysis: AnalysisResult
  startDate: string
  endDate: string
  pathFilter: string
  onClose: () => void
  onInspect: (path: string) => void
  onSelectTab: (tab: TabId) => void
  onOpenGuide: (section: GuideSectionId) => void
}) {
  const isMobileDrawer = useMobileInspectionDrawer()

  return (
    <div className={`mx-auto grid w-full max-w-[1600px] min-w-0 flex-1 ${path && isOpen ? "dashboard-content-grid--inspection xl:grid" : "grid-cols-1"}`}>
      {children}
      {path && isOpen && <aside className="fixed inset-0 z-50 min-h-0 bg-bg xl:sticky xl:top-[73px] xl:z-10 xl:h-[calc(100vh-73px)] xl:max-h-[calc(100vh-73px)] xl:min-w-0 xl:bg-transparent">
        <FileEvidencePanel
          path={path}
          analysis={analysis}
          startDate={startDate}
          endDate={endDate}
          pathFilter={pathFilter}
          onClose={onClose}
          onInspect={onInspect}
          onSelectTab={onSelectTab}
          onOpenGuide={onOpenGuide}
          isMobileDrawer={isMobileDrawer}
        />
      </aside>}
    </div>
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
  const [inspectionOpen, setInspectionOpen] = useState(false)
  const [dateRange, setDateRange] = useState({ startDate: "", endDate: "" })
  const [pathFilter, setPathFilter] = useState("")
  const [selectedContributor, setSelectedContributor] = useState<string | null>(null)
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
    setInspectionOpen(false)
    setProgress({ cacheHit: false, phases: { clone: "running" } })
    setRefreshKey(key => key + 1)
  }, [])
  const openGuide = useCallback((section: GuideSectionId) => {
    setGuideSection(section)
    setActiveTab("guide")
  }, [])
  const inspectFile = useCallback((path: string) => {
    setSelectedFile(path)
    setInspectionOpen(true)
  }, [])
  const closeInspection = useCallback(() => setInspectionOpen(false), [])
  const reopenInspection = useCallback(() => setInspectionOpen(true), [])

  const filters: DashboardFilters = { ...dateRange, path: pathFilter }
  const dashboardAnalysis = data?.analysis
  const matchingCommits = useMemo(() => dashboardAnalysis ? filterCommits(dashboardAnalysis.commitLog, filters) : [], [dashboardAnalysis, dateRange, pathFilter])
  const matchingCommitHashes = useMemo(() => new Set(matchingCommits.map(commit => commit.hash)), [matchingCommits])
  const pathCommitFrequency = useMemo(() => {
    if (!dashboardAnalysis || !pathFilter.trim()) return null
    const counts = new Map<string, number>()
    for (const commit of filterCommits(dashboardAnalysis.commitLog, { startDate: "", endDate: "", path: pathFilter })) {
      const day = commit.timestamp.slice(0, 10)
      counts.set(day, (counts.get(day) ?? 0) + 1)
    }
    return [...counts].sort(([a], [b]) => a.localeCompare(b))
  }, [dashboardAnalysis, pathFilter])
  const fileMatches = useCallback((path: string) => matchesPath(path, pathFilter), [pathFilter])
  const exportMarkdown = useCallback(() => { if (dashboardAnalysis) downloadText(`${repo}-wot-git-report.md`, markdownSummary(dashboardAnalysis), "text/markdown;charset=utf-8") }, [dashboardAnalysis, repo])

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
          <InspectionReopenControl path={inspectionOpen ? null : selectedFile} onOpen={reopenInspection} />
          <DashboardContent path={selectedFile} isOpen={inspectionOpen} analysis={data.analysis} startDate={dateRange.startDate} endDate={dateRange.endDate} pathFilter={pathFilter} onClose={closeInspection} onInspect={inspectFile} onSelectTab={setActiveTab} onOpenGuide={openGuide}>
          <main className="min-w-0 space-y-6 p-6">
            <div className="flex justify-end"><ExportCsvButton filename={`${repo}-health.csv`} analyzedAt={data.analysis.analyzedAt} historyTruncated={data.analysis.scan.historyTruncated} commitFilesTruncated={data.analysis.scan.commitFilesTruncated} headers={["Record type", "Category", "Status", "Score", "Title", "Path"]} rows={[...data.health.categories.map(c => ["category",c.label,c.status,c.score ?? "N/A",c.summary,""]), ...data.health.findings.map(f => ["finding",f.category,f.severity,"",f.title,f.path ?? ""])]} /></div>
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
          </DashboardContent>
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
          <InspectionReopenControl path={inspectionOpen ? null : selectedFile} onOpen={reopenInspection} />
          <DashboardContent path={selectedFile} isOpen={inspectionOpen} analysis={data.analysis} startDate={dateRange.startDate} endDate={dateRange.endDate} pathFilter={pathFilter} onClose={closeInspection} onInspect={inspectFile} onSelectTab={setActiveTab} onOpenGuide={openGuide}>
          <main className="min-w-0 space-y-6 p-6">
            <ProjectGuide initialSection={guideSection} onSectionChange={setGuideSection} />
          </main>
          </DashboardContent>
        </div>
      </div>
    )
  }

  const analysis = data.analysis
  const totalBugFixCommits = analysis.commitLog.filter((c) => c.isBugFix).length
  const filteredCommitSizes = analysis.commitSizes.filter(size => matchingCommitHashes.has(size.hash))

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
        <InspectionReopenControl path={inspectionOpen ? null : selectedFile} onOpen={reopenInspection} />
        <DashboardContent path={selectedFile} isOpen={inspectionOpen} analysis={analysis} startDate={dateRange.startDate} endDate={dateRange.endDate} pathFilter={pathFilter} onClose={closeInspection} onInspect={inspectFile} onSelectTab={setActiveTab} onOpenGuide={openGuide}>
        <main className="min-w-0 p-6 space-y-6">
          <section aria-label="Shared report filters" className="flex flex-wrap items-end gap-3 border border-border bg-surface/40 p-3">
            <label className="flex flex-col gap-1 text-[11px] text-muted">From<input aria-label="Shared history start date" type="date" value={dateRange.startDate} max={dateRange.endDate || undefined} onChange={e => setDateRange(current => ({ ...current, startDate: e.target.value }))} className="border border-border bg-bg px-2 py-1 text-xs text-primary" /></label>
            <label className="flex flex-col gap-1 text-[11px] text-muted">To<input aria-label="Shared history end date" type="date" value={dateRange.endDate} min={dateRange.startDate || undefined} onChange={e => setDateRange(current => ({ ...current, endDate: e.target.value }))} className="border border-border bg-bg px-2 py-1 text-xs text-primary" /></label>
            <label className="flex min-w-[190px] flex-col gap-1 text-[11px] text-muted">File path contains<input aria-label="Shared file path filter" type="search" placeholder="e.g. src/api" value={pathFilter} onChange={e => setPathFilter(e.target.value)} className="border border-border bg-bg px-2 py-1 text-xs text-primary" /></label>
            {(dateRange.startDate || dateRange.endDate || pathFilter) && <button type="button" onClick={() => { setDateRange({ startDate: "", endDate: "" }); setPathFilter("") }} className="border border-border px-2 py-1 text-xs text-muted hover:text-primary">Clear filters</button>}
            <p className="basis-full text-[11px] text-muted">Date filters narrow commit-level records. Path filters narrow matching rows. Hotspot, churn, ownership, and co-change calculations remain full-scan results.</p>
          </section>
          <div className="flex flex-wrap justify-end gap-2">
            {activeTab === "overview" && <button type="button" onClick={exportMarkdown} className="border border-border px-3 py-1.5 text-xs text-muted hover:text-primary">Download Markdown report</button>}
          </div>
          <ScanCoverageNotice analysis={analysis} health={data.health} onOpenGuide={openGuide} />
          {/* Active Tab Panel */}
          {activeTab === "overview" && <RepositoryOverview data={data} onSelectTab={setActiveTab} onInspect={inspectFile} onOpenGuide={openGuide} pathFilter={pathFilter} onSelectContributor={identity => { setSelectedContributor(identity); setActiveTab("ownership") }} />}
          {activeTab === "hotspots" && <HotspotChart data={analysis.hotspots.filter(x => fileMatches(x.path))} onInspect={inspectFile} selectedFile={inspectionOpen ? selectedFile : null} onOpenGuide={openGuide} repo={repo} analyzedAt={analysis.analyzedAt} historyTruncated={analysis.scan.historyTruncated} commitFilesTruncated={analysis.scan.commitFilesTruncated} />}
          {activeTab === "bugfiles" && (
            <BugFilesTable
              data={analysis.bugFiles.filter(x => fileMatches(x.path))}
              totalBugFixCommits={totalBugFixCommits}
              owner={owner}
              repo={repo}
              onInspect={inspectFile}
              selectedFile={inspectionOpen ? selectedFile : null}
              onOpenGuide={openGuide}
              analyzedAt={analysis.analyzedAt}
              historyTruncated={analysis.scan.historyTruncated}
              commitFilesTruncated={analysis.scan.commitFilesTruncated}
            />
          )}
          {activeTab === "commits" && <CommitActivity data={pathCommitFrequency ? pathCommitFrequency.map(([date,count]) => ({ date,count })) : analysis.commits} commitLog={analysis.commitLog} owner={owner} repo={repo} historyTruncated={analysis.scan.historyTruncated} commitFilesTruncated={analysis.scan.commitFilesTruncated} onInspect={inspectFile} onOpenGuide={openGuide} startDate={dateRange.startDate} endDate={dateRange.endDate} onDateRangeChange={(startDate,endDate) => setDateRange(current => ({ ...current,startDate,endDate }))} pathFilter={pathFilter} analyzedAt={analysis.analyzedAt} comparisonPartial={analysis.scan.historyTruncated || analysis.scan.commitFilesTruncated} />}
          {activeTab === "commitsizes" && (
            <CommitSizes
              data={filteredCommitSizes}
              commitLog={analysis.commitLog}
              owner={owner}
              repo={repo}
              onOpenGuide={openGuide}
              analyzedAt={analysis.analyzedAt}
              historyTruncated={analysis.scan.historyTruncated}
              commitFilesTruncated={analysis.scan.commitFilesTruncated}
            />
          )}
          {activeTab === "churn" && <ChurnTable data={analysis.churn.filter(x => fileMatches(x.path))} onInspect={inspectFile} selectedFile={inspectionOpen ? selectedFile : null} onOpenGuide={openGuide} repo={repo} analyzedAt={analysis.analyzedAt} historyTruncated={analysis.scan.historyTruncated} commitFilesTruncated={analysis.scan.commitFilesTruncated} />}
          {activeTab === "commitlog" && (
            <CommitLog data={matchingCommits} owner={owner} repo={repo} onOpenGuide={openGuide} analyzedAt={analysis.analyzedAt} historyTruncated={analysis.scan.historyTruncated} commitFilesTruncated={analysis.scan.commitFilesTruncated} />
          )}
          {activeTab === "ownership" && <OwnershipTable data={analysis.ownership.filter(x => fileMatches(x.path))} selectedContributor={selectedContributor} onClearContributor={() => setSelectedContributor(null)} onInspect={inspectFile} selectedFile={inspectionOpen ? selectedFile : null} onOpenGuide={openGuide} repo={repo} analyzedAt={analysis.analyzedAt} historyTruncated={analysis.scan.historyTruncated} commitFilesTruncated={analysis.scan.commitFilesTruncated} />}
          {activeTab === "cochange" && <CoChangeTable data={analysis.cochange.filter(x => fileMatches(x.fileA) || fileMatches(x.fileB))} onInspect={inspectFile} selectedFile={inspectionOpen ? selectedFile : null} onOpenGuide={openGuide} repo={repo} analyzedAt={analysis.analyzedAt} historyTruncated={analysis.scan.historyTruncated} commitFilesTruncated={analysis.scan.commitFilesTruncated} />}
          {activeTab === "outline" && <OutlineTree data={Object.fromEntries(Object.entries(analysis.outline).filter(([path]) => fileMatches(path)))} onInspect={inspectFile} selectedFile={inspectionOpen ? selectedFile : null} onOpenGuide={openGuide} repo={repo} analyzedAt={analysis.analyzedAt} historyTruncated={analysis.scan.historyTruncated} commitFilesTruncated={analysis.scan.commitFilesTruncated} />}
        </main>
        </DashboardContent>
      </div>
    </div>
  )
}
