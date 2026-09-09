"use client";
import { useState, useEffect } from "react";
import type { Hotspot } from "@repolens/types";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceArea,
} from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { RotateCcw } from "lucide-react";

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
  const [refAreaLeft, setRefAreaLeft] = useState<number | null>(null);
  const [refAreaRight, setRefAreaRight] = useState<number | null>(null);
  const [refAreaTop, setRefAreaTop] = useState<number | null>(null);
  const [refAreaBottom, setRefAreaBottom] = useState<number | null>(null);
  const [xDomain, setXDomain] = useState<[number, number]>([0, 1]);
  const [yDomain, setYDomain] = useState<[number, number]>([0, 1]);

  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  const isZoomed =
    xDomain[0] !== 0 ||
    xDomain[1] !== 1 ||
    yDomain[0] !== 0 ||
    yDomain[1] !== 1;

  const handleZoom = () => {
    if (
      refAreaLeft === null ||
      refAreaRight === null ||
      refAreaTop === null ||
      refAreaBottom === null ||
      refAreaLeft === refAreaRight ||
      refAreaTop === refAreaBottom
    ) {
      setRefAreaLeft(null);
      setRefAreaRight(null);
      setRefAreaTop(null);
      setRefAreaBottom(null);
      return;
    }

    const xMin = Math.min(refAreaLeft, refAreaRight);
    const xMax = Math.max(refAreaLeft, refAreaRight);
    const yMin = Math.min(refAreaTop, refAreaBottom);
    const yMax = Math.max(refAreaTop, refAreaBottom);

    setXDomain([parseFloat(xMin.toFixed(3)), parseFloat(xMax.toFixed(3))]);
    setYDomain([parseFloat(yMin.toFixed(3)), parseFloat(yMax.toFixed(3))]);
    setRefAreaLeft(null);
    setRefAreaRight(null);
    setRefAreaTop(null);
    setRefAreaBottom(null);
  };

  const resetZoom = () => {
    setXDomain([0, 1]);
    setYDomain([0, 1]);
    setRefAreaLeft(null);
    setRefAreaRight(null);
    setRefAreaTop(null);
    setRefAreaBottom(null);
  };

  // Take top 300 files to avoid chart congestion
  const points = data.slice(0, 300).map((h) => ({
    path: h.path,
    x: h.churnScore,
    y: h.sizeScore,
    score: h.hotspotScore,
  }));

  return (
    <Card id="hotspots">
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
          <div>
            <CardTitle>Hotspot Map</CardTitle>
            <p className="text-xs text-muted">File size vs change frequency.</p>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-muted">
            {isZoomed && (
              <button
                onClick={resetZoom}
                className="inline-flex items-center gap-1 text-accent hover:underline font-mono bg-accent/10 px-2 py-0.5 rounded border border-accent/20"
              >
                <RotateCcw size={11} /> Reset Zoom
              </button>
            )}
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-success"></span> Safe
              (&lt;0.3)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-warning"></span> Moderate
              (0.3-0.6)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-danger"></span> Hotspot
              (&ge;0.6)
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div
          className="relative h-[340px] w-full pt-2 select-none"
          onDoubleClick={resetZoom}
        >
          {/* Subtle Quadrant labels (only shown when not zoomed in) */}
          {!isZoomed && (
            <>
              <div className="absolute top-2 left-10 text-[10px] text-muted/40 uppercase font-mono pointer-events-none">
                Large &amp; Stable
              </div>
              <div className="absolute top-2 right-4 text-[10px] text-danger/50 uppercase font-mono font-semibold pointer-events-none">
                Hotspot Zone (High Churn &amp; Large)
              </div>
              <div className="absolute bottom-6 left-10 text-[10px] text-success/50 uppercase font-mono pointer-events-none">
                Safe Zone
              </div>
              <div className="absolute bottom-6 right-4 text-[10px] text-muted/40 uppercase font-mono pointer-events-none">
                Active &amp; Small
              </div>
            </>
          )}

          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart
              margin={{ top: 10, right: 20, left: -20, bottom: 20 }}
              onMouseDown={(e: any) => {
                if (e && e.xValue != null && e.yValue != null) {
                  setRefAreaLeft(e.xValue);
                  setRefAreaTop(e.yValue);
                }
              }}
              onMouseMove={(e: any) => {
                if (
                  refAreaLeft !== null &&
                  e &&
                  e.xValue != null &&
                  e.yValue != null
                ) {
                  setRefAreaRight(e.xValue);
                  setRefAreaBottom(e.yValue);
                }
              }}
              onMouseUp={handleZoom}
            >
              <XAxis
                type="number"
                dataKey="x"
                name="Churn Score"
                domain={xDomain}
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
                domain={yDomain}
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
              {refAreaLeft !== null &&
                refAreaRight !== null &&
                refAreaTop !== null &&
                refAreaBottom !== null && (
                  <ReferenceArea
                    x1={refAreaLeft}
                    x2={refAreaRight}
                    y1={refAreaTop}
                    y2={refAreaBottom}
                    stroke="#2f81f7"
                    strokeOpacity={0.6}
                    fill="#2f81f7"
                    fillOpacity={0.15}
                  />
                )}
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
