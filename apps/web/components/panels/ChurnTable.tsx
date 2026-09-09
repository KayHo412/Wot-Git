"use client"
import { useState, useMemo } from "react"
import type { FileChurn } from "@repolens/types"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { FilePath } from "@/components/shared/FilePath"
import { isStale, formatDate } from "@/lib/utils"
import { Search } from "lucide-react"

interface ChurnTableProps {
  data: FileChurn[]
}

export function ChurnTable({ data }: ChurnTableProps) {
  const [search, setSearch] = useState("")
  const [limit, setLimit] = useState(50)

  const filtered = useMemo(() => {
    return data.filter((item) => item.path.toLowerCase().includes(search.toLowerCase()))
  }, [data, search])

  const displayed = filtered.slice(0, limit)

  return (
    <Card id="churn">
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
          <div>
            <CardTitle>File Churn</CardTitle>
            <p className="text-xs text-muted">Most frequently modified files across repository commits</p>
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
                <th className="py-2.5 px-4 font-medium text-right w-32">Commits</th>
                <th className="py-2.5 px-4 font-medium text-right w-36">Last Touched</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {displayed.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-muted">
                    No files found matching "{search}"
                  </td>
                </tr>
              ) : (
                displayed.map((f, i) => {
                  const stale = isStale(f.lastTouched)
                  return (
                    <tr key={f.path} className="hover:bg-surface/60 transition-colors">
                      <td className="py-2 px-4 text-center font-mono text-muted/60">{i + 1}</td>
                      <td className="py-2 px-4">
                        <FilePath path={f.path} />
                      </td>
                      <td className="py-2 px-4 text-right font-mono font-semibold text-primary">
                        {f.churnCount.toLocaleString()}
                      </td>
                      <td className="py-2 px-4 text-right font-mono text-xs">
                        <span className={stale ? "text-muted/60" : "text-success"}>
                          {f.lastTouched !== "unknown" ? formatDate(f.lastTouched) : "unknown"}
                        </span>
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
