"use client"
import type { AnalysisResult } from "@wot-git/types"
import { X } from "lucide-react"
import type { TabId } from "@/components/layout/Sidebar"
import { formatDate } from "@/lib/utils"
import { FilePath } from "@/components/shared/FilePath"

interface FileEvidencePanelProps {
  path: string
  analysis: AnalysisResult
  onClose: () => void
  onInspect: (path: string) => void
  onSelectTab: (tab: TabId) => void
}

export function FileEvidencePanel({ path, analysis, onClose, onInspect, onSelectTab }: FileEvidencePanelProps) {
  const churn = analysis.churn.find(item => item.path === path)
  const hotspot = analysis.hotspots.find(item => item.path === path)
  const ownership = analysis.ownership.find(item => item.path === path)
  const bugFile = analysis.bugFiles.find(item => item.path === path)
  const related = analysis.cochange
    .filter(pair => pair.fileA === path || pair.fileB === path)
    .sort((a, b) => b.count - a.count || a.fileA.localeCompare(b.fileA) || a.fileB.localeCompare(b.fileB))
    .slice(0, 5)

  return (
    <section aria-labelledby="file-evidence-title" className="border border-border bg-surface/40">
      <header className="flex items-start justify-between gap-4 border-b border-border px-4 py-3">
        <div className="min-w-0">
          <h2 id="file-evidence-title" className="text-sm font-semibold text-primary">File evidence</h2>
          <div className="mt-1 break-all"><FilePath path={path} maxLength={180} /></div>
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
