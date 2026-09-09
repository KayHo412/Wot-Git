"use client"
import { useState, useMemo } from "react"
import type { FileOwnership } from "@repolens/types"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { FilePath } from "@/components/shared/FilePath"
import { Search, AlertTriangle, ShieldCheck } from "lucide-react"

interface OwnershipTableProps {
  data: FileOwnership[]
}

export function OwnershipTable({ data }: OwnershipTableProps) {
  const [search, setSearch] = useState("")
  const [busFactorOnly, setBusFactorOnly] = useState(false)
  const [limit, setLimit] = useState(50)

  const busFactorCount = useMemo(() => {
    return data.filter((f) => f.isBusFactor).length
  }, [data])

  const filtered = useMemo(() => {
    return data.filter((item) => {
      if (busFactorOnly && !item.isBusFactor) return false
      if (!search) return true
      const q = search.toLowerCase()
      return item.path.toLowerCase().includes(q) || item.dominantAuthor.toLowerCase().includes(q)
    })
  }, [data, search, busFactorOnly])

  const displayed = filtered.slice(0, limit)

  return (
    <Card id="ownership">
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
          <div>
            <CardTitle>Code Ownership &amp; Bus Factor</CardTitle>
            <p className="text-xs text-muted">
              Author contribution distribution and single-author risk identification
            </p>
          </div>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1.5 text-xs text-muted cursor-pointer hover:text-primary transition-colors select-none mr-2">
              <input
                type="checkbox"
                checked={busFactorOnly}
                onChange={(e) => {
                  setBusFactorOnly(e.target.checked)
                  setLimit(50)
                }}
                className="rounded border-border bg-surface text-danger focus:ring-danger"
              />
              <span className="text-danger">Bus Factor Only ({busFactorCount})</span>
            </label>
            <div className="relative w-48 sm:w-60">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
              <Input
                placeholder="Filter path or author..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
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
                <th className="py-2.5 px-4 w-12 text-center font-mono">#</th>
                <th className="py-2.5 px-4 font-medium">File Path</th>
                <th className="py-2.5 px-4 w-28 text-center font-medium">Contributors</th>
                <th className="py-2.5 px-4 font-medium">Dominant Author</th>
                <th className="py-2.5 px-4 w-32 text-center font-medium">Risk Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {displayed.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-muted">
                    No files found matching filters
                  </td>
                </tr>
              ) : (
                displayed.map((f, i) => (
                  <tr
                    key={f.path}
                    className={`hover:bg-surface/60 transition-colors ${
                      f.isBusFactor ? "border-l-2 border-l-danger" : ""
                    }`}
                  >
                    <td className="py-2 px-4 text-center font-mono text-muted/60">{i + 1}</td>
                    <td className="py-2 px-4">
                      <FilePath path={f.path} />
                    </td>
                    <td className="py-2 px-4 text-center font-mono text-muted">
                      {f.authors.length}
                    </td>
                    <td className="py-2 px-4 truncate max-w-[200px]" title={f.dominantAuthor}>
                      <span className="font-mono text-primary text-[11px]">{f.dominantAuthor}</span>
                    </td>
                    <td className="py-2 px-4 text-center">
                      {f.isBusFactor ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-danger bg-danger/10 border border-danger/30 rounded px-1.5 py-0.5">
                          <AlertTriangle size={11} /> 1 Author
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] text-muted/60">
                          <ShieldCheck size={11} className="text-success" /> Shared
                        </span>
                      )}
                    </td>
                  </tr>
                ))
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
