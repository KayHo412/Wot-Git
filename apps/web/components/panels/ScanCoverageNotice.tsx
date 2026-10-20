import type { AnalysisResult, RepoHealthResult } from "@wot-git/types"

export function ScanCoverageNotice({ analysis, health }: { analysis: AnalysisResult; health?: RepoHealthResult }) {
  const limits: string[] = []
  if (analysis.scan.historyTruncated) limits.push(`only the most recent ${analysis.scan.commitLimit.toLocaleString()} commits are included in Git-history metrics`)
  if (analysis.scan.filesTruncated) limits.push(`file metrics are limited to ${analysis.scan.fileLimit.toLocaleString()} tracked files`)
  if (analysis.scan.commitFilesTruncated) limits.push("commit file lists are capped at 100 included paths per commit")
  if (analysis.scan.ownershipTruncated) limits.push("ownership is limited to 100 distinct authors per file")
  if (analysis.scan.cochangeTruncated) limits.push("co-change coverage is limited by per-commit or pair-count caps")
  if (analysis.scan.outlineTruncated) limits.push(`the code outline is limited to ${analysis.scan.outlineFileLimit} files`)
  if (health?.historyTruncated && !analysis.scan.historyTruncated) limits.push(`Health history is limited to ${health.historyCommitLimit.toLocaleString()} commits`)
  if (health?.historyFilesTruncated) limits.push("Health historical change signals include at most 100 source paths per commit")
  if (health?.filesTruncated) limits.push("Health current and monthly repository checks use a prioritized set of at most 10,000 files")
  if (!limits.length) return null
  return <aside role="status" className="border-l-2 border-warning bg-warning/5 px-3 py-2 text-xs text-muted">
    <span className="font-semibold text-primary">Limited scan coverage.</span> {limits.join("; ")}. Results may omit older history or files.
  </aside>
}
