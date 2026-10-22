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
import { FileInspectButton } from "@/components/shared/FileInspectButton";
import { InfoTip } from "@/components/shared/InfoTip";
import type { GuideSectionId } from "@/components/guide/guideTypes";
import { ExportCsvButton } from "@/components/shared/ExportCsvButton";

interface HotspotChartProps {
  data: Hotspot[];
  onInspect?: (path: string) => void;
  selectedFile?: string | null;
  onOpenGuide: (section: GuideSectionId) => void;
  analyzedAt: string; historyTruncated: boolean; commitFilesTruncated: boolean; repo: string;
}

function getPointColor(score: number): string {
  if (score >= 0.6) return "#f85149"; // danger red
  if (score >= 0.3) return "#d29922"; // warning amber
  return "#3fb950"; // safe green
}

export function HotspotChart({ data, onInspect, selectedFile, onOpenGuide, analyzedAt, historyTruncated, commitFilesTruncated, repo }: HotspotChartProps) {
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
            <CardTitle className="flex items-center gap-2">Hotspot Map <InfoTip term="Hotspot score" description="A repository-relative average of normalized file-change frequency and current file size. It highlights files to investigate; it does not diagnose defects." guideSection="calculations" onOpenGuide={onOpenGuide} /></CardTitle>
            <p className="text-xs text-muted">
              Relative file size vs change frequency. Points in the top-right have the highest relative hotspot scores in this repository.
            </p>
          </div>

          <div className="flex items-center gap-4 flex-wrap">
            {/* Legend */}
            <div className="flex items-center gap-3 text-[11px] text-muted">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-success"></span> Lower relative score
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
        <div className="mb-2"><ExportCsvButton filename={`${repo}-hotspots.csv`} analyzedAt={analyzedAt} historyTruncated={historyTruncated} commitFilesTruncated={commitFilesTruncated} headers={["Path", "Churn score", "Size score", "Hotspot score"]} rows={data.map(x => [x.path,x.churnScore,x.sizeScore,x.hotspotScore])} /></div>
        <div className="relative h-[340px] w-full pt-2 select-none">
          {/* Subtle quadrant labels */}
          <>
            <div className="absolute top-1 left-12 text-[10px] text-muted/40 uppercase font-mono pointer-events-none">
              Large
            </div>
            <div className="absolute bottom-4 right-1 text-[10px] text-muted/40 uppercase font-mono pointer-events-none">
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
                      <div className="border border-border bg-surface px-3 py-2 text-xs space-y-1 max-w-sm">
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
        {onInspect && <div className="mt-3 border-t border-border pt-3">
          <h3 className="text-xs font-semibold text-primary">Inspect top relative hotspots</h3>
          <ul className="mt-1 divide-y divide-border/60 sm:grid sm:grid-cols-2 sm:gap-x-6">
            {data.slice(0, 5).map(file => <li key={file.path} className="flex items-center justify-between gap-3 py-2 text-xs">
              <span className="min-w-0 truncate font-mono text-primary" title={file.path}>{file.path}</span>
              <span className="shrink-0 font-mono text-muted">{file.hotspotScore.toFixed(4)}<FileInspectButton path={file.path} onInspect={onInspect} selectedPath={selectedFile} /></span>
            </li>)}
          </ul>
        </div>}
      </CardContent>
    </Card>
  );
}
