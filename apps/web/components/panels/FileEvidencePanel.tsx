"use client"
import type { AnalysisResult } from "@wot-git/types"
import { X } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import type { TabId } from "@/components/layout/Sidebar"
import { formatDate } from "@/lib/utils"
import { FilePath } from "@/components/shared/FilePath"
import { InfoTip } from "@/components/shared/InfoTip"
import type { GuideSectionId } from "@/components/guide/guideTypes"
import { commitsForFile } from "@/lib/repositoryEvidence"
import { filterCommitsByMonth, monthlyFileActivity } from "@/lib/dashboardExploration"
import { useMemo } from "react"
import { commitsInDateRange } from "@/lib/commitActivity"

interface FileEvidencePanelProps {
  path: string
  analysis: AnalysisResult
  onClose: () => void
  onInspect: (path: string) => void
  onSelectTab: (tab: TabId) => void
  onOpenGuide: (section: GuideSectionId) => void
  startDate: string
  endDate: string
  pathFilter: string
}

export function FileEvidencePanel({ path, analysis, onClose, onInspect, onSelectTab, onOpenGuide, startDate, endDate, pathFilter }: FileEvidencePanelProps) {
  const panelRef = useRef<HTMLElement>(null)
  const previousPath = useRef<string | null>(null)
  const [announcement, setAnnouncement] = useState("")
  const [selectedMonth, setSelectedMonth] = useState("")

  useEffect(() => {
    const switched = previousPath.current !== null && previousPath.current !== path
    setAnnouncement(switched ? `Inspection switched to ${path}` : `Now inspecting ${path}`)
    previousPath.current = path

    const alignPanelBelowNavigation = () => {
      const panel = panelRef.current
      if (!panel) return

      const header = document.querySelector<HTMLElement>("header.sticky")
      const mobileNav = document.getElementById("mobile-analysis-nav")
      const stickyBottom = Math.max(
        header?.getBoundingClientRect().bottom ?? 0,
        mobileNav?.getClientRects().length ? mobileNav.getBoundingClientRect().bottom : 0,
      )
      const panelTop = panel.getBoundingClientRect().top
      const visible = panelTop < window.innerHeight && panel.getBoundingClientRect().bottom > 0
      const targetTop = stickyBottom + 16
      if (visible && Math.abs(panelTop - targetTop) > 1) {
        window.scrollBy(0, panelTop - targetTop)
      }
    }

    panelRef.current?.scrollIntoView({ block: "start", behavior: "auto" })
    const frame = window.requestAnimationFrame(alignPanelBelowNavigation)

    const resizeObserver = new ResizeObserver(alignPanelBelowNavigation)
    const header = document.querySelector<HTMLElement>("header.sticky")
    const mobileNav = document.getElementById("mobile-analysis-nav")
    if (header) resizeObserver.observe(header)
    if (mobileNav) resizeObserver.observe(mobileNav)

    return () => {
      window.cancelAnimationFrame(frame)
      resizeObserver.disconnect()
    }
  }, [path])

  const churn = analysis.churn.find(item => item.path === path)
  const hotspot = analysis.hotspots.find(item => item.path === path)
  const ownership = analysis.ownership.find(item => item.path === path)
  const bugFile = analysis.bugFiles.find(item => item.path === path)
  const supportingCommits = commitsForFile(analysis.commitLog, path)
  const monthlyActivity = useMemo(() => monthlyFileActivity(analysis.commitLog, path, analysis.analyzedAt, startDate, endDate), [analysis.commitLog, path, analysis.analyzedAt, startDate, endDate])
  const filteredSupportingCommits = filterCommitsByMonth(commitsInDateRange(supportingCommits, startDate, endDate)
    .filter(commit => !pathFilter.trim() || commit.files.some(file => file.path.toLowerCase().includes(pathFilter.trim().toLowerCase())))
    , selectedMonth)
  const displayedCommits = filteredSupportingCommits.slice(0, 10)
  const commitEvidenceMayBePartial = analysis.scan.historyTruncated || analysis.scan.commitFilesTruncated
  const related = analysis.cochange
    .filter(pair => pair.fileA === path || pair.fileB === path)
    .sort((a, b) => b.count - a.count || a.fileA.localeCompare(b.fileA) || a.fileB.localeCompare(b.fileB))
    .slice(0, 5)

  return (
    <section ref={panelRef} aria-labelledby="file-evidence-title" className="border-l-2 border-l-accent border-y border-r border-border bg-surface/40">
      <header className="flex items-start justify-between gap-4 border-b border-border px-4 py-3">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-accent">File inspection</p>
          <h2 id="file-evidence-title" className="mt-1 flex items-center gap-2 text-sm font-semibold text-primary">Currently inspecting <InfoTip term="File evidence" description="A combined view of this file’s available Git-history signals. Missing items mean the signal was not present in the returned analysis; they do not imply that no activity ever occurred." guideSection="how-to-read" onOpenGuide={onOpenGuide} /></h2>
          <div className="mt-1 break-all text-sm"><FilePath path={path} maxLength={180} /></div>
          <p role="status" aria-live="polite" aria-atomic="true" className="mt-2 text-xs font-medium text-accent">{announcement}</p>
          <p className="mt-2 text-xs text-muted">Observed Git-history signals for investigation. These are not a bug verdict or a recommendation to change the file.</p>
        </div>
        <button type="button" onClick={onClose} aria-label="Close file evidence" className="shrink-0 p-1 text-muted hover:text-primary focus-visible:outline focus-visible:outline-1 focus-visible:outline-accent">
          <X size={16} />
        </button>
      </header>

      <div className="grid gap-px bg-border sm:grid-cols-2 lg:grid-cols-4">
        <Evidence label="Commits observed" value={churn ? `${churn.churnCount}` : "No data"} detail={churn ? `Last touched ${churn.lastTouched === "unknown" ? "date unknown" : formatDate(churn.lastTouched)}` : "Outside the analyzed file set"} onClick={() => onSelectTab("churn")} />
        <Evidence label="Relative hotspot" value={hotspot ? hotspot.hotspotScore.toFixed(4) : "No data"} detail={hotspot ? `Change ${hotspot.churnScore.toFixed(4)} · size ${hotspot.sizeScore.toFixed(4)}` : "Outside the analyzed file set"} onClick={() => onSelectTab("hotspots")} />
        <Evidence label="Contributors" value={ownership ? `${ownership.authors.length}` : "No data"} detail={ownership ? `Dominant: ${ownership.dominantAuthor}${ownership.isBusFactor ? " · one recorded author" : ""}` : "No ownership data"} onClick={() => onSelectTab("ownership")} />
        <Evidence label="Bug-fix-associated commits" value={bugFile ? `${bugFile.bugFixCount}` : "0"} detail="Commit subjects matched the bug-fix keyword heuristic" onClick={() => onSelectTab("bugfiles")} />
      </div>

      <div className="border-t border-border px-4 py-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-xs font-semibold text-primary">Monthly file activity</h3>
          <span className="text-[11px] text-muted">12 months ending {analysis.analyzedAt.slice(0, 7)}</span>
        </div>
        <div className="mt-2 grid grid-cols-4 gap-1 sm:grid-cols-6 lg:grid-cols-12" role="group" aria-label="Select a month to filter file commit evidence">
          {monthlyActivity.map(point => <button key={point.month} type="button" aria-pressed={selectedMonth === point.month} onClick={() => setSelectedMonth(current => current === point.month ? "" : point.month)} className={`border px-1 py-2 text-center focus-visible:outline focus-visible:outline-1 focus-visible:outline-accent ${selectedMonth === point.month ? "border-accent bg-accent/10 text-accent" : "border-border text-muted hover:bg-surface"}`} title={`${point.month}: ${point.count} commits`}><span className="block text-[10px]">{point.month.slice(5)}</span><span className="mt-1 block font-mono text-xs">{point.count}</span></button>)}
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2"><h3 className="text-xs font-semibold text-primary">Commits that changed this file</h3><span className="text-[11px] text-muted">{displayedCommits.length} shown · {filteredSupportingCommits.length} matching</span></div>
        {(selectedMonth || startDate || endDate || pathFilter) && <button type="button" onClick={() => setSelectedMonth("")} className="mt-1 text-[11px] text-accent underline hover:no-underline">Clear month selection {selectedMonth ? `(${selectedMonth})` : "and use shared filters"}</button>}
        {displayedCommits.length ? <ul className="mt-2 divide-y divide-border/60">
          {displayedCommits.map(commit => {
            const file = commit.files.find(item => item.path === path)!
            return <li key={commit.hash} className="flex flex-col gap-1 py-2 text-xs sm:flex-row sm:items-start sm:justify-between sm:gap-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <a href={`${analysis.repoUrl.replace(/\/+$/, "")}/commit/${commit.hash}`} target="_blank" rel="noreferrer" className="font-mono text-accent underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-1 focus-visible:outline-accent">{commit.hash.slice(0, 7)}</a>
                  <span className="text-muted">{commit.timestamp ? formatDate(commit.timestamp) : "Date unavailable"}</span>
                  {commit.isBugFix && <span className="border border-border px-1.5 py-0.5 text-[10px] text-muted">Bug-fix keyword: “{commit.matchedBugFixKeyword ?? "matched"}”</span>}
                </div>
                <p className="mt-1 break-words text-primary">{commit.message || "(no subject)"}</p>
              </div>
              <span className="shrink-0 font-mono text-[11px] text-muted">+{file.insertions} / −{file.deletions}</span>
            </li>
          })}
        </ul> : <p className="mt-2 text-xs text-muted">No matching commit records were returned for this file.</p>}
        {filteredSupportingCommits.length > displayedCommits.length && <p className="mt-2 text-[11px] text-muted">Showing the 10 most recent of {filteredSupportingCommits.length} matching commits.</p>}
        {commitEvidenceMayBePartial && <p className="mt-2 border-l-2 border-accent/60 pl-2 text-[11px] text-muted">This commit list may be incomplete because the scan reached its history or per-commit file limit.</p>}
      </div>

      <div className="px-4 py-3">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="text-xs font-semibold text-primary">Files often changed alongside this file</h3>
          <button type="button" onClick={() => onSelectTab("cochange")} className="text-[11px] text-muted underline-offset-2 hover:text-accent hover:underline">Open co-change</button>
        </div>
        {related.length ? <ul className="mt-2 divide-y divide-border/60">
          {related.map(pair => {
            const other = pair.fileA === path ? pair.fileB : pair.fileA
            return <li key={`${pair.fileA}\0${pair.fileB}`} className="flex items-center justify-between gap-3 py-2 text-xs">
              <button type="button" onClick={() => onInspect(other)} className="min-w-0 break-all text-left text-primary underline-offset-2 hover:text-accent hover:underline focus-visible:outline focus-visible:outline-1 focus-visible:outline-accent">{other}</button>
              <span className="shrink-0 font-mono text-muted">{pair.count} commits</span>
            </li>
          })}
        </ul> : <p className="mt-2 text-xs text-muted">No returned co-change pairs include this file.</p>}
      </div>
      {analysis.scan.historyTruncated && <p className="border-t border-border px-4 py-2 text-[11px] text-muted">These signals use the most recent {analysis.scan.commitLimit.toLocaleString()} commits; older history was not included.</p>}
    </section>
  )
}

function Evidence({ label, value, detail, onClick }: { label: string; value: string; detail: string; onClick: () => void }) {
  return <div className="min-w-0 bg-bg px-4 py-3">
    <div className="text-[11px] uppercase tracking-wide text-muted">{label}</div>
    <div className="mt-1 font-mono text-base font-semibold text-primary">{value}</div>
    <p className="mt-1 min-h-8 text-[11px] leading-4 text-muted">{detail}</p>
    <button type="button" onClick={onClick} className="mt-1 text-[11px] text-accent underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-1 focus-visible:outline-accent">Open analysis</button>
  </div>
}
