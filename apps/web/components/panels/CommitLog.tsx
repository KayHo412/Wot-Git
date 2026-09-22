"use client"
import { useState, useMemo } from "react"
import type { CommitRecord } from "@wot-git/types"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { HashBadge } from "@/components/shared/HashBadge"
import { BugBadge } from "@/components/shared/BugBadge"
import { formatDate } from "@/lib/utils"
import { Search, ChevronLeft, ChevronRight } from "lucide-react"

interface CommitLogProps {
  data: CommitRecord[]
  owner: string
  repo: string
}

const PAGE_SIZE = 50

export function CommitLog({ data, owner, repo }: CommitLogProps) {
  const [search, setSearch] = useState("")
  const [bugOnly, setBugOnly] = useState(false)
  const [page, setPage] = useState(1)

  const filtered = useMemo(() => {
    return data.filter((c) => {
      if (bugOnly && !c.isBugFix) return false
      if (!search) return true
      const q = search.toLowerCase()
      return (
        c.message.toLowerCase().includes(q) ||
        c.authorName.toLowerCase().includes(q) ||
        c.hash.toLowerCase().includes(q)
      )
    })
  }, [data, search, bugOnly])

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE) || 1
  const currentPage = Math.min(page, totalPages)
  const paged = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  return (
    <Card id="commitlog">
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
          <div className="flex flex-col gap-1">
            <CardTitle>Commit Log</CardTitle>
            <p className="text-xs text-muted">
              Structured historical commit stream ({filtered.length.toLocaleString()} matches)
            </p>
          </div>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1.5 text-xs text-muted cursor-pointer hover:text-primary transition-colors select-none mr-2">
              <input
                type="checkbox"
                checked={bugOnly}
                onChange={(e) => {
                  setBugOnly(e.target.checked)
                  setPage(1)
                }}
                className="rounded border-border bg-surface text-accent focus:ring-accent"
              />
              Bug Fixes Only
            </label>
            <div className="relative w-48 sm:w-60">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
              <Input
                placeholder="Filter message, author, hash..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setPage(1)
                }}
                className="h-8 pl-8 text-xs"
              />
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-border bg-surface/50 text-muted">
                <th className="py-2.5 px-4 w-24 font-mono">Hash</th>
                <th className="py-2.5 px-4 w-36 font-medium">Author</th>
                <th className="py-2.5 px-4 w-28 font-medium">Date</th>
                <th className="py-2.5 px-4 font-medium">Message</th>
                <th className="py-2.5 px-4 w-20 text-center font-medium">Files</th>
                <th className="py-2.5 px-4 w-24 text-center font-medium">Type</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {paged.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-muted">
                    No commits found matching filters
                  </td>
                </tr>
              ) : (
                paged.map((c) => (
                  <tr key={c.hash} className="hover:bg-surface/60 transition-colors">
                    <td className="py-2 px-4">
                      <HashBadge hash={c.hash} owner={owner} repo={repo} />
                    </td>
                    <td className="py-2 px-4 truncate max-w-[140px]" title={`${c.authorName} <${c.authorEmail}>`}>
                      <span className="text-primary font-medium">{c.authorName}</span>
                    </td>
                    <td className="py-2 px-4 text-muted font-mono text-[11px] whitespace-nowrap">
                      {c.timestamp ? formatDate(c.timestamp) : "—"}
                    </td>
                    <td className="py-2 px-4 max-w-md truncate" title={c.message}>
                      <span className="text-primary/90">{c.message}</span>
                    </td>
                    <td className="py-2 px-4 text-center font-mono text-muted">
                      {c.files.length}
                    </td>
                    <td className="py-2 px-4 text-center">
                      {c.isBugFix ? <BugBadge /> : <span className="text-muted/40">—</span>}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {/* Pagination controls */}
        {totalPages > 1 && (
          <div className="p-3 border-t border-border flex items-center justify-between text-xs text-muted">
            <div>
              Page {currentPage} of {totalPages} ({filtered.length.toLocaleString()} commits)
            </div>
            <div className="flex gap-1">
              <button
                disabled={currentPage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="p-1 rounded hover:bg-surface disabled:opacity-30 disabled:pointer-events-none text-primary"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                disabled={currentPage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="p-1 rounded hover:bg-surface disabled:opacity-30 disabled:pointer-events-none text-primary"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
