"use client"
import { useState, useMemo, useEffect } from "react"
import type { FileOutline } from "@wot-git/types"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { FileCode, FunctionSquare, Box, Search } from "lucide-react"
import { FileInspectButton } from "@/components/shared/FileInspectButton"
import { InfoTip } from "@/components/shared/InfoTip"
import type { GuideSectionId } from "@/components/guide/guideTypes"
import { ExportCsvButton } from "@/components/shared/ExportCsvButton"

interface OutlineTreeProps {
  data: Record<string, FileOutline[]>
  onInspect?: (path: string) => void
  selectedFile?: string | null
  onOpenGuide: (section: GuideSectionId) => void
  analyzedAt: string; historyTruncated: boolean; commitFilesTruncated: boolean; repo: string
}

export function OutlineTree({ data, onInspect, selectedFile: inspectedFile, onOpenGuide, analyzedAt, historyTruncated, commitFilesTruncated, repo }: OutlineTreeProps) {
  const fileKeys = useMemo(() => Object.keys(data).sort(), [data])
  const [selectedFile, setSelectedFile] = useState<string>(fileKeys[0] ?? "")
  const [search, setSearch] = useState("")

  const filteredFiles = useMemo(() => {
    if (!search) return fileKeys
    return fileKeys.filter((f) => f.toLowerCase().includes(search.toLowerCase()))
  }, [fileKeys, search])

  useEffect(() => {
    if (filteredFiles.length > 0 && !filteredFiles.includes(selectedFile)) {
      setSelectedFile(filteredFiles[0])
    }
  }, [filteredFiles, selectedFile])

  const currentSymbols = data[selectedFile] ?? []

  if (fileKeys.length === 0) {
    return (
      <Card id="outline">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">Code Symbol Outline <InfoTip term="Code outline" description="A regex-based list of selected function and class declarations from supported source files, not a complete language parser." guideSection="calculations" onOpenGuide={onOpenGuide} /></CardTitle>
          <p className="text-xs text-muted">No supported source code outline extracted</p>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card id="outline">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">Code Symbol Outline <InfoTip term="Code outline" description="A regex-based list of selected function and class declarations from supported source files, not a complete language parser." guideSection="calculations" onOpenGuide={onOpenGuide} /></CardTitle>
        <p className="text-xs text-muted">
          Extracted function and class declarations across parsed source files ({fileKeys.length} files)
        </p>
      </CardHeader>
      <div className="px-4 pt-3"><ExportCsvButton filename={`${repo}-outline.csv`} analyzedAt={analyzedAt} historyTruncated={historyTruncated} commitFilesTruncated={commitFilesTruncated} headers={["Path", "Symbol", "Type", "Line"]} rows={filteredFiles.flatMap(path => (data[path] ?? []).map(symbol => [path,symbol.name,symbol.type,symbol.line]))} /></div>
      <CardContent className="p-0">
        <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-border min-h-[350px]">
          {/* File selector column */}
          <div className="flex flex-col">
            <div className="p-2 border-b border-border">
              <div className="relative">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
                <Input
                  aria-label="Filter outline files"
                  placeholder="Filter files..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-7 pl-7 text-xs bg-bg"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto max-h-[350px] p-1 divide-y divide-border/20">
              {filteredFiles.length === 0 ? (
                <p className="px-2.5 py-4 text-center text-xs text-muted">No files match this filter.</p>
              ) : filteredFiles.map((file) => (
                <button
                  key={file}
                  onClick={() => setSelectedFile(file)}
                  className={`w-full text-left px-2.5 py-1.5 rounded text-xs font-mono truncate transition-colors flex items-center gap-1.5 ${
                    selectedFile === file
                      ? "bg-accent/15 text-accent font-semibold"
                      : "text-muted hover:text-primary hover:bg-surface/60"
                  }`}
                  title={file}
                  aria-label={`${file}${selectedFile === file ? ", selected" : ""}`}
                >
                  <FileCode size={13} className="shrink-0" />
                  <span className="truncate">{file}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Symbol detail column */}
          <div className="col-span-2 p-4 flex flex-col">
            {filteredFiles.length === 0 ? (
              <div className="flex flex-1 items-center justify-center py-8 text-center text-xs text-muted">
                Adjust the filter to show files and their symbols.
              </div>
            ) : <>
              <div className="text-xs font-mono text-muted mb-3 flex flex-wrap items-center gap-2 border-b border-border/50 pb-2">
                <span className="text-primary font-semibold break-all">{selectedFile}</span>
                <span>·</span>
                <span className="shrink-0">{currentSymbols.length} declarations</span>
                <FileInspectButton path={selectedFile} onInspect={onInspect} selectedPath={inspectedFile} />
              </div>

              <div className="flex-1 overflow-y-auto max-h-[300px] space-y-1.5">
                {currentSymbols.length === 0 ? (
                  <div className="text-xs text-muted py-8 text-center">No symbols found in this file</div>
                ) : currentSymbols.map((sym, idx) => (
                  <div
                    key={`${sym.name}-${sym.line}-${idx}`}
                    className="flex items-center justify-between p-2 rounded bg-surface/50 border border-border/40 text-xs font-mono"
                  >
                    <div className="flex items-center gap-2">
                      {sym.type === "function" ? (
                        <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-accent/15 text-accent border border-accent/20">
                          <FunctionSquare size={11} /> fn
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-warning/15 text-warning border border-warning/20">
                          <Box size={11} /> class
                        </span>
                      )}
                      <span className="text-primary font-medium">{sym.name}</span>
                    </div>
                    <span className="text-muted text-[11px]">line {sym.line}</span>
                  </div>
                ))}
              </div>
            </>}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
