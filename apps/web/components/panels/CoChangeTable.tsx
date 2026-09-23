"use client"
import { useState, useMemo } from "react"
import type { CoChange } from "@wot-git/types"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { FilePath } from "@/components/shared/FilePath"
import { Search, Link2 } from "lucide-react"

interface CoChangeTableProps {
  data: CoChange[]
}

const EXCLUDED_EXTENSIONS = new Set([
  '.md', '.txt', '.json', '.yml', '.yaml', '.html', '.css', '.scss',
  '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.lock', '.toml'
])

const EXCLUDED_FILENAMES = new Set([
  'package.json', 'package-lock.json', 'pnpm-lock.yaml', 'yarn.lock',
  '.gitignore', '.eslintignore', '.prettierignore'
])

const EXCLUDED_DIRS = ['docs/', 'examples/', 'benchmarks/', 'spec/', '.github/']

function isExcludedFile(path: string): boolean {
  const normalized = path.replace(/\\/g, '/')
  const filename = normalized.split('/').pop() || ''

  if (EXCLUDED_FILENAMES.has(filename)) return true

  const ext = filename.includes('.') ? '.' + filename.split('.').pop()?.toLowerCase() : ''
  if (EXCLUDED_EXTENSIONS.has(ext)) return true

  if (EXCLUDED_DIRS.some(dir => normalized.startsWith(dir) || normalized.includes('/' + dir))) return true

  return false
}

export function CoChangeTable({ data }: CoChangeTableProps) {
  const [search, setSearch] = useState("")
  const [limit, setLimit] = useState(50)

  const maxCount = useMemo(() => {
    return data.length > 0 ? data[0].count : 1
  }, [data])

  const filtered = useMemo(() => {
    return data.filter((pair) => {
      if (isExcludedFile(pair.fileA) || isExcludedFile(pair.fileB)) return false
      if (!search) return true
      const q = search.toLowerCase()
      return pair.fileA.toLowerCase().includes(q) || pair.fileB.toLowerCase().includes(q)
    })
  }, [data, search])

  const displayed = filtered.slice(0, limit)

  return (
    <Card id="cochange">
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
          <div className="flex flex-col gap-1">
            <CardTitle>Temporal File Coupling (Co-Change)</CardTitle>
            <p className="text-xs text-muted">
              Pairs of files that consistently change together in the same commits
            </p>
          </div>
          <div className="relative w-full sm:w-64">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
            <Input
              placeholder="Search coupled files..."
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
                <th className="py-2.5 px-4 font-medium">File A</th>
                <th className="py-2.5 px-4 font-medium w-8 text-center text-muted/40"></th>
                <th className="py-2.5 px-4 font-medium">File B</th>
                <th className="py-2.5 px-4 font-medium text-right w-44">Co-Change Count</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {displayed.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-muted">
                    No coupled pairs found matching "{search}"
                  </td>
                </tr>
              ) : (
                displayed.map((pair, i) => {
                  const pct = (pair.count / maxCount) * 100
                  return (
                    <tr key={`${pair.fileA}-${pair.fileB}`} className="hover:bg-surface/60 transition-colors">
                      <td className="py-2 px-4 text-center font-mono text-muted/60">{i + 1}</td>
                      <td className="py-2 px-4">
                        <FilePath path={pair.fileA} />
                      </td>
                      <td className="py-2 px-4 text-center text-muted/40">
                        <Link2 size={12} />
                      </td>
                      <td className="py-2 px-4">
                        <FilePath path={pair.fileB} />
                      </td>
                      <td className="py-2 px-4">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-20 h-1.5 rounded-full bg-border overflow-hidden">
                            <div
                              className="h-full rounded-full bg-accent"
                              style={{ width: `${Math.max(5, pct)}%` }}
                            />
                          </div>
                          <span className="font-mono text-xs font-semibold text-primary w-12 text-right">
                            {pair.count}x
                          </span>
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
