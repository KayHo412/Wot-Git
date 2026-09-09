"use client"
import { useState, useEffect } from "react"
import type { CommitSize } from "@repolens/types"
import { ScatterChart, Scatter, XAxis, YAxis, Tooltip, ResponsiveContainer, ZAxis, Brush } from "recharts"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { shortenHash } from "@/lib/utils"

interface CommitSizesProps {
  data: CommitSize[]
}

export function CommitSizes({ data }: CommitSizesProps) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  if (!mounted) return null

  // Map to format suitable for scatter chart
  const scatterData = data.slice(-1000).map((c, i) => ({
    index: i,
    hash: c.hash,
    date: c.date,
    insertions: c.insertions,
    deletions: c.deletions,
    total: c.insertions + c.deletions,
  }))

  return (
    <Card id="commitsizes">
      <CardHeader>
        <CardTitle>Commit Size Distribution</CardTitle>
        <p className="text-xs text-muted">Lines changed per commit (insertions + deletions) across recent commits</p>
      </CardHeader>
      <CardContent>
        <div className="h-[260px] w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart data={scatterData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <XAxis
                dataKey="index"
                name="Commit"
                stroke="#8b949e"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: "#30363d" }}
                tickFormatter={(val) => scatterData[val]?.date ?? ""}
                minTickGap={50}
              />
              <YAxis
                dataKey="total"
                name="Lines Changed"
                stroke="#8b949e"
                fontSize={11}
                tickLine={false}
                axisLine={false}
              />
              <ZAxis range={[15, 60]} />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const d = payload[0].payload
                    return (
                      <div className="rounded-md border border-border bg-surface px-3 py-2 text-xs shadow-md space-y-1">
                        <div className="font-mono text-accent font-semibold">{shortenHash(d.hash)} · {d.date}</div>
                        <div className="text-muted">Total: <span className="text-primary font-mono">{d.total.toLocaleString()} lines</span></div>
                        <div className="flex gap-2 text-[11px] font-mono">
                          <span className="text-success">+{d.insertions}</span>
                          <span className="text-danger">-{d.deletions}</span>
                        </div>
                      </div>
                    )
                  }
                  return null
                }}
              />
              <Scatter data={scatterData} fill="#2f81f7" fillOpacity={0.6} />
              <Brush
                dataKey="index"
                height={26}
                stroke="#30363d"
                fill="#161b22"
                tickFormatter={(val) => scatterData[val]?.date ?? ""}
                travellerWidth={8}
              />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
