import type { AnalysisResult, RepoHealthResult } from "@wot-git/types"
import { InfoTip } from "@/components/shared/InfoTip"
import type { GuideSectionId } from "@/components/guide/guideTypes"

export function ScanCoverageNotice({ analysis, health, onOpenGuide }: { analysis: AnalysisResult; health?: RepoHealthResult; onOpenGuide: (section: GuideSectionId) => void }) {
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
  return <aside role="status" className="flex items-start gap-2 border-l-2 border-warning bg-warning/5 px-3 py-2 text-xs text-muted">
    <span><span className="font-semibold text-primary">Limited scan coverage.</span> {limits.join("; ")}. Results may omit older history or files.</span>
    <InfoTip term="Limited scan coverage" description="One or more analysis limits affected the report. Affected signals may omit older commits, files, or file pairs; consult the detailed coverage notes before comparing results." guideSection="calculations" onOpenGuide={onOpenGuide} />
  </aside>
}
