"use client"
import { useState, useEffect, useMemo } from "react"
import type { CommitSize, CommitRecord } from "@wot-git/types"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { HashBadge } from "@/components/shared/HashBadge"
import { formatDate } from "@/lib/utils"
import { Scale, Zap, FileDiff, AlertCircle } from "lucide-react"

interface CommitSizesProps {
  data: CommitSize[]
  commitLog?: CommitRecord[]
  owner?: string
  repo?: string
}

interface Bucket {
  name: string
  label: string
  range: string
  count: number
  percentage: number
  color: string
}

export function CommitSizes({ data, commitLog = [], owner, repo }: CommitSizesProps) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  // 1. Calculate Summary Stats
  const { medianSize, atomicRatio, totalLines, topCommits, buckets } = useMemo(() => {
    if (!data || data.length === 0) {
      return {
        medianSize: 0,
        atomicRatio: 0,
        totalLines: 0,
        topCommits: [],
        buckets: [],
      }
    }

    const totals = data.map((c) => c.insertions + c.deletions)
    const sortedTotals = [...totals].sort((a, b) => a - b)

    // Median
    const mid = Math.floor(sortedTotals.length / 2)
    const median =
      sortedTotals.length % 2 !== 0
        ? sortedTotals[mid]
        : Math.round((sortedTotals[mid - 1] + sortedTotals[mid]) / 2)

    // Atomic ratio (<= 50 lines changed)
    const atomicCount = totals.filter((t) => t <= 50).length
    const ratio = Math.round((atomicCount / totals.length) * 1000) / 10

    // Total lines
    const totalLinesSum = totals.reduce((sum, t) => sum + t, 0)

    // Buckets
    let micro = 0
    let small = 0
    let medium = 0
    let large = 0
    let huge = 0

    for (const t of totals) {
      if (t < 10) micro++
      else if (t <= 50) small++
      else if (t <= 200) medium++
      else if (t <= 500) large++
      else huge++
    }

    const totalCount = totals.length
    const calculatedBuckets: Bucket[] = [
      {
        name: "Micro",
        label: "Micro (<10)",
        range: "< 10 lines",
        count: micro,
        percentage: Math.round((micro / totalCount) * 1000) / 10,
        color: "#2dd4bf", // teal
      },
      {
        name: "Small",
        label: "Small (10-50)",
        range: "10 – 50 lines",
        count: small,
        percentage: Math.round((small / totalCount) * 1000) / 10,
        color: "#3fb950", // green (atomic standard)
      },
      {
        name: "Medium",
        label: "Medium (50-200)",
        range: "50 – 200 lines",
        count: medium,
        percentage: Math.round((medium / totalCount) * 1000) / 10,
        color: "#2f81f7", // blue
      },
      {
        name: "Large",
        label: "Large (200-500)",
        range: "200 – 500 lines",
        count: large,
        percentage: Math.round((large / totalCount) * 1000) / 10,
        color: "#d29922", // amber
      },
      {
        name: "Huge",
        label: "Huge (>500)",
        range: "> 500 lines",
        count: huge,
        percentage: Math.round((huge / totalCount) * 1000) / 10,
        color: "#f85149", // red
      },
    ]

    // Top 5 largest commits
    const logMap = new Map<string, CommitRecord>()
    for (const record of commitLog) {
      logMap.set(record.hash, record)
    }

    const sortedCommits = [...data]
      .sort((a, b) => b.insertions + b.deletions - (a.insertions + a.deletions))
      .slice(0, 5)
      .map((c) => {
        const meta = logMap.get(c.hash)
        return {
          hash: c.hash,
          date: c.date,
          insertions: c.insertions,
          deletions: c.deletions,
          total: c.insertions + c.deletions,
          authorName: meta?.authorName ?? "Unknown",
          message: meta?.message ?? "Commit " + c.hash.slice(0, 7),
        }
      })

    return {
      medianSize: median,
      atomicRatio: ratio,
      totalLines: totalLinesSum,
      topCommits: sortedCommits,
      buckets: calculatedBuckets,
    }
  }, [data, commitLog])

  if (!mounted) return null

  return (
    <div className="space-y-6" id="commitsizes">
      {/* 1. Stat Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="border-border bg-surface">
          <CardContent className="py-3 px-4 flex items-center gap-3">
            <div className="p-2 rounded bg-success/10 text-success shrink-0">
              <Zap size={16} />
            </div>
            <div>
              <div className="text-xs text-muted">Atomic Ratio (&le;50 lines)</div>
              <div className="text-lg font-bold font-mono text-primary">
                {atomicRatio}%
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-surface">
          <CardContent className="py-3 px-4 flex items-center gap-3">
            <div className="p-2 rounded bg-accent/10 text-accent shrink-0">
              <Scale size={16} />
            </div>
            <div>
              <div className="text-xs text-muted">Median Commit Size</div>
              <div className="text-lg font-bold font-mono text-primary">
                {medianSize.toLocaleString()}{" "}
                <span className="text-xs font-normal text-muted">lines</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-surface">
          <CardContent className="py-3 px-4 flex items-center gap-3">
            <div className="p-2 rounded bg-warning/10 text-warning shrink-0">
              <FileDiff size={16} />
            </div>
            <div>
              <div className="text-xs text-muted">Total Code Churn</div>
              <div className="text-lg font-bold font-mono text-primary">
                {totalLines.toLocaleString()}{" "}
                <span className="text-xs font-normal text-muted">lines</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 2. Granularity Distribution Histogram */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
            <div className="flex flex-col gap-1">
              <CardTitle>Commit Size Distribution</CardTitle>
              <p className="text-xs text-muted">
                Granularity breakdown across all {data.length.toLocaleString()} commits. Small/atomic commits (&le;50 lines) minimize bug risk.
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[240px] w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={buckets} margin={{ top: 10, right: 10, left: -20, bottom: 10 }}>
                <XAxis
                  dataKey="label"
                  stroke="#8b949e"
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: "#30363d" }}
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
                      const d = payload[0].payload as Bucket
                      return (
                        <div className="rounded-md border border-border bg-surface px-3 py-2 text-xs shadow-md space-y-1">
                          <div className="font-semibold text-primary flex items-center gap-2">
                            <span
                              className="w-2.5 h-2.5 rounded-full"
                              style={{ backgroundColor: d.color }}
                            />
                            {d.name} Commits
                          </div>
                          <div className="text-muted font-mono text-[11px]">{d.range}</div>
                          <div className="pt-1 border-t border-border/40 flex justify-between gap-4">
                            <span className="text-muted">Volume:</span>
                            <span className="font-mono font-bold text-primary">
                              {d.count.toLocaleString()} ({d.percentage}%)
                            </span>
                          </div>
                        </div>
                      )
                    }
                    return null
                  }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {buckets.map((b) => (
                    <Cell key={b.name} fill={b.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* 3. Top Largest Commits (Outliers) */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertCircle size={15} className="text-warning" />
            <CardTitle>Top 5 Largest Commits (Outliers)</CardTitle>
          </div>
          <p className="text-xs text-muted">
            The largest historical commits with the highest total lines inserted and deleted
          </p>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border bg-surface/50 text-muted">
                  <th className="py-2.5 px-4 w-10 text-center font-mono">#</th>
                  <th className="py-2.5 px-4 w-24 font-mono">Hash</th>
                  <th className="py-2.5 px-4 w-28 font-mono text-[11px]">Date</th>
                  <th className="py-2.5 px-4 w-36 font-medium">Author</th>
                  <th className="py-2.5 px-4 font-medium">Message</th>
                  <th className="py-2.5 px-4 font-mono text-right w-24">Additions</th>
                  <th className="py-2.5 px-4 font-mono text-right w-24">Deletions</th>
                  <th className="py-2.5 px-4 font-mono text-right w-28">Total Lines</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {topCommits.map((c, i) => (
                  <tr key={c.hash} className="hover:bg-surface/60 transition-colors">
                    <td className="py-2.5 px-4 text-center font-mono text-muted">{i + 1}</td>
                    <td className="py-2.5 px-4">
                      <HashBadge hash={c.hash} owner={owner} repo={repo} />
                    </td>
                    <td className="py-2.5 px-4 text-muted font-mono text-[11px] whitespace-nowrap">
                      {formatDate(c.date)}
                    </td>
                    <td className="py-2.5 px-4 truncate max-w-[140px] text-primary" title={c.authorName}>
                      {c.authorName}
                    </td>
                    <td className="py-2.5 px-4 max-w-xs truncate text-muted" title={c.message}>
                      {c.message}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono text-success">
                      +{c.insertions.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono text-danger">
                      -{c.deletions.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono font-semibold text-primary">
                      {c.total.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
