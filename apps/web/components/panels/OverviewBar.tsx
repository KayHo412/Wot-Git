import type { AnalysisResult } from "@wot-git/types"
import { Flame, RefreshCw, Bug, AlertTriangle } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

interface OverviewBarProps { data: AnalysisResult }

export function OverviewBar({ data }: OverviewBarProps) {
  const totalCommits = data.commits.reduce((s, c) => s + c.count, 0)
  const bugFixCommits = data.commitLog.filter(c => c.isBugFix).length
  const busFactorFiles = data.ownership.filter(f => f.isBusFactor).length
  const topHotspot = data.hotspots[0]?.path ?? "—"

  const stats = [
    { label: "Total Commits",    value: totalCommits.toLocaleString(), icon: RefreshCw, color: "border-accent"   },
    { label: "Hottest File",     value: topHotspot,                    icon: Flame,     color: "border-danger"   },
    { label: "Bug-Fix Commits",  value: bugFixCommits.toLocaleString(), icon: Bug,      color: "border-warning"  },
    { label: "Bus Factor Files", value: busFactorFiles.toLocaleString(), icon: AlertTriangle, color: "border-danger" },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {stats.map(({ label, value, icon: Icon, color }) => (
        <Card key={label} className={`border-l-2 ${color} border-t-border border-r-border border-b-border`}>
          <CardContent className="py-3 px-4 flex items-start gap-3">
            <Icon size={14} className="text-muted mt-0.5 shrink-0" />
            <div>
              <div className="text-xs text-muted mb-0.5">{label}</div>
              <div className="text-sm font-semibold text-primary font-mono truncate max-w-[140px]" title={String(value)}>{value}</div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
