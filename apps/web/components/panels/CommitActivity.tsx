"use client"
import { useState, useEffect, useMemo } from "react"
import type { CommitFrequency, CommitRecord } from "@wot-git/types"
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, Brush } from "recharts"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { InfoTip } from "@/components/shared/InfoTip"
import type { GuideSectionId } from "@/components/guide/guideTypes"
import { commitsInDateRange } from "@/lib/commitActivity"
import { formatDate } from "@/lib/utils"
import { periodComparison } from "@/lib/dashboardExploration"
import { ExportCsvButton } from "@/components/shared/ExportCsvButton"

interface CommitActivityProps {
  data: CommitFrequency[]
  commitLog: CommitRecord[]
  owner: string
  repo: string
  historyTruncated: boolean
  onInspect: (path: string) => void
  onOpenGuide: (section: GuideSectionId) => void
  startDate: string
  endDate: string
  onDateRangeChange: (start: string, end: string) => void
  pathFilter?: string
  analyzedAt: string
  comparisonPartial: boolean
  commitFilesTruncated: boolean
}

export function CommitActivity({ data, commitLog, owner, repo, historyTruncated, onInspect, onOpenGuide, startDate, endDate, onDateRangeChange, pathFilter = "", analyzedAt, comparisonPartial, commitFilesTruncated }: CommitActivityProps) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const matchingCommits = useMemo(() => commitsInDateRange(commitLog, startDate, endDate).filter(commit => !pathFilter.trim() || commit.files.some(file => file.path.toLowerCase().includes(pathFilter.trim().toLowerCase()))), [commitLog, startDate, endDate, pathFilter])
  const chartData = useMemo(() => data.filter(point => (!startDate || point.date >= startDate) && (!endDate || point.date <= endDate)), [data, startDate, endDate])
  const startIndex = 0
  const endIndex = Math.max(0, chartData.length - 1)
  const hasDateFilter = Boolean(startDate || endDate)
  const comparison = useMemo(() => periodComparison(commitLog, analyzedAt, comparisonPartial, pathFilter), [commitLog, analyzedAt, comparisonPartial, pathFilter])
  const updateBrushRange = (range: { startIndex?: number; endIndex?: number } | null) => {
    if (!range || !chartData.length || range.startIndex === undefined || range.endIndex === undefined) return
    const first = Math.min(range.startIndex, range.endIndex)
    const last = Math.max(range.startIndex, range.endIndex)
    if (first === 0 && last >= chartData.length - 1) {
      onDateRangeChange("", "")
      return
    }
    onDateRangeChange(chartData[first]?.date ?? "", chartData[last]?.date ?? "")
  }

  if (!mounted) return null

  return (
    <Card id="commits">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">Commit Activity <InfoTip term="Commit activity" description="Daily counts of commits in the analyzed history window, grouped by Git author date." guideSection="calculations" onOpenGuide={onOpenGuide} /></CardTitle>
        <p className="text-xs text-muted">Daily commit frequency from recorded history; shared date and path filters narrow the timeline.</p>
      </CardHeader>
      <CardContent>
        <div className="h-[260px] w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="commitGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2f81f7" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#2f81f7" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="date"
                stroke="#8b949e"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: "#30363d" }}
                minTickGap={40}
              />
              <YAxis
                stroke="#8b949e"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const d = payload[0].payload as CommitFrequency
                    return (
                      <div className="rounded-md border border-border bg-surface px-3 py-2 text-xs shadow-md">
                        <div className="font-mono text-muted mb-1">{d.date}</div>
                        <div className="font-semibold text-primary">{d.count} commits</div>
                      </div>
                    )
                  }
                  return null
                }}
              />
              <Area
                type="monotone"
                dataKey="count"
                stroke="#2f81f7"
                strokeWidth={1.5}
                fillOpacity={1}
                fill="url(#commitGrad)"
              />
                <Brush
                dataKey="date"
                startIndex={startIndex}
                endIndex={endIndex}
                onChange={updateBrushRange}
                height={26}
                stroke="#30363d"
                fill="#161b22"
                tickFormatter={() => ""}
                travellerWidth={8}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 flex flex-wrap items-end gap-3 border-t border-border pt-3">
          <label className="flex flex-col gap-1 text-[11px] text-muted">From
            <input aria-label="Activity start date" type="date" value={startDate} max={endDate || undefined} onChange={event => onDateRangeChange(event.target.value, endDate)} className="border border-border bg-bg px-2 py-1 text-xs text-primary focus-visible:outline focus-visible:outline-1 focus-visible:outline-accent" />
          </label>
          <label className="flex flex-col gap-1 text-[11px] text-muted">To
            <input aria-label="Activity end date" type="date" value={endDate} min={startDate || undefined} onChange={event => onDateRangeChange(startDate, event.target.value)} className="border border-border bg-bg px-2 py-1 text-xs text-primary focus-visible:outline focus-visible:outline-1 focus-visible:outline-accent" />
          </label>
          {hasDateFilter && <button type="button" onClick={() => onDateRangeChange("", "")} className="border border-border px-2 py-1 text-xs text-muted hover:text-primary focus-visible:outline focus-visible:outline-1 focus-visible:outline-accent">Clear dates</button>}
        </div>
        <div className="mt-2"><ExportCsvButton filename={`${repo}-activity-commits.csv`} analyzedAt={analyzedAt} historyTruncated={historyTruncated} commitFilesTruncated={commitFilesTruncated} headers={["Hash", "Author", "Email", "Author date", "Subject", "Changed files"]} rows={matchingCommits.map(c => [c.hash,c.authorName,c.authorEmail,c.timestamp,c.message,c.files.map(f => f.path).join("; ")])} /></div>
        <section className="mt-5 border-t border-border pt-4" aria-labelledby="period-comparison-title">
          <h3 id="period-comparison-title" className="text-sm font-semibold text-primary">Compare activity periods</h3>
          <p className="mt-1 text-xs text-muted">Last 90 days ({comparison.recentStart} to {comparison.recentEnd}) vs previous 90 days ({comparison.previousStart} to {comparison.previousEnd}). Based on Git author dates.</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            {(["commits", "files", "contributors"] as const).map(metric => <div key={metric} className="border border-border px-3 py-2 text-xs"><span className="capitalize text-muted">{metric}</span><div className="mt-1 font-mono text-primary">{comparison.previous[metric].toLocaleString()} → {comparison.recent[metric].toLocaleString()}</div></div>)}
          </div>
          <div className="mt-3 grid gap-4 md:grid-cols-2">
            {([ ["Increased file activity", comparison.increased], ["Decreased file activity", comparison.decreased] ] as const).map(([title, files]) => <div key={title}><h4 className="text-xs font-semibold text-primary">{title}</h4>{files.length ? <ul className="mt-1 divide-y divide-border/60">{files.map(file => <li key={file.path} className="flex justify-between gap-3 py-1.5 text-xs"><button type="button" onClick={() => onInspect(file.path)} className="truncate text-left text-accent hover:underline">{file.path}</button><span className="shrink-0 font-mono text-muted">{file.previous} → {file.recent} ({file.delta > 0 ? "+" : ""}{file.delta})</span></li>)}</ul> : <p className="mt-1 text-xs text-muted">No files in this direction.</p>}</div>)}
          </div>
          {comparison.partial && <p className="mt-3 border-l-2 border-accent/60 pl-2 text-[11px] text-muted">One or both periods may be incomplete because history or commit file lists reached scan limits.</p>}
        </section>
        {(hasDateFilter || pathFilter.trim()) && <section aria-live="polite" className="mt-4 border-t border-border pt-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="text-xs font-semibold text-primary">Commits in selected period</h3>
            <span className="text-[11px] text-muted">{matchingCommits.length.toLocaleString()} recorded commits</span>
          </div>
          {!matchingCommits.length ? <p className="mt-2 text-xs text-muted">No recorded commits match these dates.</p> : <ul className="mt-2 divide-y divide-border/60">
            {matchingCommits.slice(0, 20).map(commit => <li key={commit.hash} className="py-2 text-xs">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <a href={`https://github.com/${owner}/${repo}/commit/${commit.hash}`} target="_blank" rel="noreferrer" className="font-mono text-accent underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-1 focus-visible:outline-accent">{commit.hash.slice(0, 7)}</a>
                <span className="text-muted">{commit.timestamp ? formatDate(commit.timestamp) : "Date unavailable"}</span>
                <span className="text-primary">{commit.message || "(no subject)"}</span>
              </div>
              <ul className="mt-1 flex flex-wrap gap-x-3 gap-y-1 pl-2">
                {commit.files.slice(0, 10).map(file => <li key={file.path}>
                  <button type="button" onClick={() => onInspect(file.path)} className="break-all text-left text-muted underline-offset-2 hover:text-accent hover:underline focus-visible:outline focus-visible:outline-1 focus-visible:outline-accent">{file.path} <span className="font-mono">(+{file.insertions}/−{file.deletions})</span></button>
                </li>)}
                {commit.files.length > 10 && <li className="text-muted">and {commit.files.length - 10} more recorded files</li>}
                {commit.filesTruncated && <li className="text-muted">This commit’s file list reached its scan limit.</li>}
              </ul>
            </li>)}
          </ul>}
          {matchingCommits.length > 20 && <p className="mt-2 text-[11px] text-muted">Showing the 20 most recent of {matchingCommits.length.toLocaleString()} commits in this period.</p>}
          {historyTruncated && <p className="mt-2 border-l-2 border-accent/60 pl-2 text-[11px] text-muted">This activity view uses bounded recent history; older commits are not available in this report.</p>}
        </section>}
      </CardContent>
    </Card>
  )
}
