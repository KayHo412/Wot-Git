import type { AnalysisResult } from "@wot-git/types"
import { Flame, RefreshCw, Bug, AlertTriangle } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { InfoTip } from "@/components/shared/InfoTip"
import type { GuideSectionId } from "@/components/guide/guideTypes"

interface OverviewBarProps { data: AnalysisResult; onOpenGuide: (section: GuideSectionId) => void }

export function OverviewBar({ data, onOpenGuide }: OverviewBarProps) {
  const totalCommits = data.commits.reduce((s, c) => s + c.count, 0)
  const bugFixCommits = data.commitLog.filter(c => c.isBugFix).length
  const busFactorFiles = data.ownership.filter(f => f.isBusFactor).length
  const topHotspot = data.hotspots[0]?.path ?? "—"

  const stats = [
    { label: "Total Commits",    value: totalCommits.toLocaleString(), icon: RefreshCw, color: "border-accent", term: "Commits analyzed", description: "The number of commits represented in the bounded history window; older history may be omitted when the scan limit is reached.", section: "calculations" as const },
    { label: "Hottest File",     value: topHotspot,                    icon: Flame, color: "border-danger", term: "Hottest file", description: "The file with the highest relative hotspot score among included files. This is a review signal, not a bug diagnosis.", section: "calculations" as const },
    { label: "Bug-Fix Commits",  value: bugFixCommits.toLocaleString(), icon: Bug, color: "border-warning", term: "Bug-fix commit", description: "A commit whose subject matches Wot-Git’s bug-fix keyword heuristic. Commit wording can cause false matches or misses.", section: "how-to-read" as const },
    { label: "Bus Factor Files", value: busFactorFiles.toLocaleString(), icon: AlertTriangle, color: "border-danger", term: "Single-author files", description: "Files with only one distinct author email in the analyzed history. Email aliases and history limits can affect this count.", section: "calculations" as const },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {stats.map(({ label, value, icon: Icon, color, term, description, section }) => (
        <Card key={label} className={`border-l-2 ${color} border-t-border border-r-border border-b-border`}>
          <CardContent className="py-3 px-4 flex items-start gap-3">
            <Icon size={14} className="text-muted mt-0.5 shrink-0" />
            <div>
              <div className="mb-0.5 flex items-center gap-1 text-xs text-muted">{label}<InfoTip term={term} description={description} guideSection={section} onOpenGuide={onOpenGuide} /></div>
              <div className="text-sm font-semibold text-primary font-mono truncate max-w-[140px]" title={String(value)}>{value}</div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
