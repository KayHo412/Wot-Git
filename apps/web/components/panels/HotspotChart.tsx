"use client";
import { useState, useEffect } from "react";
import type { Hotspot } from "@wot-git/types";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

interface HotspotChartProps {
  data: Hotspot[];
}

function getPointColor(score: number): string {
  if (score >= 0.6) return "#f85149"; // danger red
  if (score >= 0.3) return "#d29922"; // warning amber
  return "#3fb950"; // safe green
}

export function HotspotChart({ data }: HotspotChartProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  // Limit to 300 files without changing the chart viewport.
  const points = data.slice(0, 300).map((h) => ({
    path: h.path,
    x: h.churnScore,
    y: h.sizeScore,
    score: h.hotspotScore,
  }));

  return (
    <Card id="hotspots">
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
          <div className="flex flex-col gap-1">
            <CardTitle>Hotspot Map</CardTitle>
            <p className="text-xs text-muted">
              File size vs change frequency. High-risk hotspots appear in the
              top-right quadrant.
            </p>
          </div>

          <div className="flex items-center gap-4 flex-wrap">
            {/* Legend */}
            <div className="flex items-center gap-3 text-[11px] text-muted">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-success"></span> Safe
                (&lt;0.3)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-warning"></span>{" "}
                Moderate (0.3-0.6)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-danger"></span> Hotspot
                (&ge;0.6)
              </span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="relative h-[340px] w-full pt-2 select-none">
          {/* Subtle quadrant labels */}
          <>
            <div className="absolute top-2 left-10 text-[10px] text-muted/40 uppercase font-mono pointer-events-none">
              Large
            </div>
            <div className="absolute top-2 right-4 text-[10px] text-danger/50 uppercase font-mono font-semibold pointer-events-none">
              Hotspot Zone (High Churn &amp; Large)
            </div>
            <div className="absolute bottom-6 left-10 text-[10px] text-success/50 uppercase font-mono pointer-events-none">
              Safe Zone
            </div>
            <div className="absolute bottom-6 right-4 text-[10px] text-muted/40 uppercase font-mono pointer-events-none">
              Active
            </div>
          </>

          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart
              margin={{ top: 10, right: 20, left: -20, bottom: 20 }}
            >
              <XAxis
                type="number"
                dataKey="x"
                name="Churn Score"
                domain={[0, 1]}
                stroke="#8b949e"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: "#30363d" }}
                label={{
                  value: "Change Frequency (Normalized Churn)",
                  position: "insideBottom",
                  offset: -10,
                  fill: "#8b949e",
                  fontSize: 11,
                }}
              />
              <YAxis
                type="number"
                dataKey="y"
                name="Size Score"
                domain={[0, 1]}
                stroke="#8b949e"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: "#30363d" }}
                label={{
                  value: "File Size (Normalized)",
                  angle: -90,
                  position: "insideLeft",
                  offset: 10,
                  fill: "#8b949e",
                  fontSize: 11,
                }}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const d = payload[0].payload;
                    return (
                      <div className="rounded-md border border-border bg-surface px-3 py-2 text-xs shadow-md space-y-1 max-w-sm">
                        <div className="font-mono text-primary font-semibold break-all">
                          {d.path}
                        </div>
                        <div className="flex justify-between text-muted pt-1 border-t border-border/50">
                          <span>Hotspot Score:</span>
                          <span className="font-mono font-bold text-primary">
                            {d.score}
                          </span>
                        </div>
                        <div className="flex justify-between text-[11px] text-muted">
                          <span>Churn Score:</span>
                          <span className="font-mono">{d.x}</span>
                        </div>
                        <div className="flex justify-between text-[11px] text-muted">
                          <span>Size Score:</span>
                          <span className="font-mono">{d.y}</span>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Scatter data={points}>
                {points.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={getPointColor(entry.score)}
                    fillOpacity={0.7}
                  />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
