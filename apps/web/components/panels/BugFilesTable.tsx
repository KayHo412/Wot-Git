"use client"
import { useState, useMemo } from "react"
import type { BugAssociatedFile } from "@repolens/types"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { FilePath } from "@/components/shared/FilePath"
import { HashBadge } from "@/components/shared/HashBadge"
import { Search } from "lucide-react"

interface BugFilesTableProps {
  data: BugAssociatedFile[]
  totalBugFixCommits: number
  owner: string
  repo: string
}

export function BugFilesTable({ data, totalBugFixCommits, owner, repo }: BugFilesTableProps) {
  const [search, setSearch] = useState("")
  const [limit, setLimit] = useState(50)

  const filtered = useMemo(() => {
    return data.filter((item) => item.path.toLowerCase().includes(search.toLowerCase()))
  }, [data, search])

  const displayed = filtered.slice(0, limit)

  return (
    <Card id="bugfiles">
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
          <div>
            <CardTitle>Bug-Associated Files</CardTitle>
            <p className="text-xs text-muted">
              Files modified in commits whose messages indicate defect resolution ({totalBugFixCommits.toLocaleString()} bug-fix commits total)
            </p>
          </div>
          <div className="relative w-full sm:w-64">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
            <Input
              placeholder="Search file path..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 pl-8 text-xs"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-border bg-surface/50 text-muted">
                <th className="py-2.5 px-4 w-12 text-center font-mono">#</th>
                <th className="py-2.5 px-4 font-medium">File Path</th>
                <th className="py-2.5 px-4 font-medium text-right w-36">Bug Fix Count</th>
                <th className="py-2.5 px-4 font-medium w-48">Share of Defect Commits</th>
                <th className="py-2.5 px-4 font-medium hidden md:table-cell">Recent Fix Commits</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {displayed.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-muted">
                    No files found matching "{search}"
                  </td>
                </tr>
              ) : (
                displayed.map((f, i) => {
                  const share = totalBugFixCommits > 0 ? (f.bugFixCount / totalBugFixCommits) * 100 : 0
                  return (
                    <tr key={f.path} className="hover:bg-surface/60 transition-colors">
                      <td className="py-2 px-4 text-center font-mono text-muted/60">{i + 1}</td>
                      <td className="py-2 px-4">
                        <FilePath path={f.path} />
                      </td>
                      <td className="py-2 px-4 text-right font-mono font-bold text-danger">
                        {f.bugFixCount.toLocaleString()}
                      </td>
                      <td className="py-2 px-4">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 rounded-full bg-border overflow-hidden">
                            <div
                              className="h-full rounded-full bg-danger/80"
                              style={{ width: `${Math.min(100, Math.max(2, share))}%` }}
                            />
                          </div>
                          <span className="font-mono text-xs text-muted w-10 text-right">{share.toFixed(1)}%</span>
                        </div>
                      </td>
                      <td className="py-2 px-4 hidden md:table-cell">
                        <div className="flex flex-wrap gap-1">
                          {f.commits.slice(0, 3).map((hash) => (
                            <HashBadge key={hash} hash={hash} owner={owner} repo={repo} />
                          ))}
                          {f.commits.length > 3 && (
                            <span className="text-[11px] text-muted self-center">+{f.commits.length - 3}</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
        {filtered.length > limit && (
          <div className="p-3 border-t border-border flex justify-center">
            <button
              onClick={() => setLimit((prev) => prev + 50)}
              className="text-xs font-medium text-accent hover:underline"
            >
              Show 50 more ({filtered.length - limit} remaining)
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
