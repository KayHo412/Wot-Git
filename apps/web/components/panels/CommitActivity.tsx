"use client"
import { useState, useEffect } from "react"
import type { CommitFrequency } from "@repolens/types"
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, Brush } from "recharts"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"

interface CommitActivityProps {
  data: CommitFrequency[]
}

export function CommitActivity({ data }: CommitActivityProps) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  if (!mounted) return null

  return (
    <Card id="commits">
      <CardHeader>
        <CardTitle>Commit Activity</CardTitle>
        <p className="text-xs text-muted">Daily commit frequency across the repository history</p>
      </CardHeader>
      <CardContent>
        <div className="h-[260px] w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
                height={26}
                stroke="#30363d"
                fill="#161b22"
                tickFormatter={() => ""}
                travellerWidth={8}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
