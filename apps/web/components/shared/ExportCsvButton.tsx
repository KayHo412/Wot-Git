"use client"
import { downloadCsv } from "@/lib/dashboardExploration"

export interface ExportMetadata { analyzedAt: string; historyTruncated: boolean; commitFilesTruncated: boolean }

export function ExportCsvButton({ filename, analyzedAt, historyTruncated, commitFilesTruncated, headers, rows }: { filename: string; analyzedAt: string; historyTruncated: boolean; commitFilesTruncated: boolean; headers: string[]; rows: unknown[][] }) {
  return <button type="button" onClick={() => downloadCsv(filename, analyzedAt, historyTruncated, commitFilesTruncated, headers, rows)} className="border border-border px-2 py-1 text-[11px] text-muted hover:text-primary focus-visible:outline focus-visible:outline-1 focus-visible:outline-accent">Export all filtered rows as CSV</button>
}
