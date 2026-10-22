import type { AnalysisResult, CommitRecord, FileOwnership } from "@wot-git/types"
import { commitsInDateRange } from "./commitActivity"
import { topContributors } from "./repositoryEvidence"

export interface DashboardFilters { startDate: string; endDate: string; path: string }

export function matchesPath(path: string, query: string): boolean {
  return !query.trim() || path.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())
}

export function filterCommits(commits: CommitRecord[], filters: DashboardFilters): CommitRecord[] {
  return commitsInDateRange(commits, filters.startDate, filters.endDate)
    .filter(commit => !filters.path.trim() || commit.files.some(file => matchesPath(file.path, filters.path)))
}

export function filterCommitsByMonth(commits: CommitRecord[], month: string): CommitRecord[] {
  return month ? commits.filter(commit => commit.timestamp.slice(0, 7) === month) : commits
}

export function filterOwnershipByContributor(files: FileOwnership[], identity: string | null): FileOwnership[] {
  return identity ? files.filter(file => file.authors.includes(identity)) : files
}

export function periodComparison(commits: CommitRecord[], asOf: string, truncated: boolean, pathFilter = "") {
  const end = asOf.slice(0, 10)
  const endDate = new Date(`${end}T00:00:00Z`)
  const recentStartDate = new Date(endDate); recentStartDate.setUTCDate(recentStartDate.getUTCDate() - 89)
  const previousEndDate = new Date(recentStartDate); previousEndDate.setUTCDate(previousEndDate.getUTCDate() - 1)
  const previousStartDate = new Date(previousEndDate); previousStartDate.setUTCDate(previousStartDate.getUTCDate() - 89)
  const iso = (date: Date) => date.toISOString().slice(0, 10)
  const recentStart = iso(recentStartDate), previousEnd = iso(previousEndDate), previousStart = iso(previousStartDate)
  const inRange = (start: string, finish: string) => commits.filter(c => c.timestamp.slice(0, 10) >= start && c.timestamp.slice(0, 10) <= finish && (!pathFilter.trim() || c.files.some(file => matchesPath(file.path, pathFilter))))
  const recent = inRange(recentStart, end), previous = inRange(previousStart, previousEnd)
  const summary = (list: CommitRecord[]) => ({
    commits: list.length,
    files: new Set(list.flatMap(c => c.files.map(f => f.path))).size,
    contributors: new Set(list.map(c => c.authorEmail || c.authorName)).size,
  })
  const counts = (list: CommitRecord[]) => {
    const map = new Map<string, number>()
    for (const c of list) for (const f of c.files) map.set(f.path, (map.get(f.path) ?? 0) + 1)
    return map
  }
  const now = counts(recent), before = counts(previous)
  const files = [...new Set([...now.keys(), ...before.keys()])].map(path => ({ path, recent: now.get(path) ?? 0, previous: before.get(path) ?? 0, delta: (now.get(path) ?? 0) - (before.get(path) ?? 0) }))
  return { recentStart, recentEnd: end, previousStart, previousEnd, recent: summary(recent), previous: summary(previous), increased: files.filter(f => f.delta > 0).sort((a,b) => b.delta-a.delta || a.path.localeCompare(b.path)).slice(0,5), decreased: files.filter(f => f.delta < 0).sort((a,b) => a.delta-b.delta || a.path.localeCompare(b.path)).slice(0,5), partial: truncated }
}

export function monthlyFileActivity(commits: CommitRecord[], path: string, asOf: string, startDate = "", endDate = "") {
  const end = new Date(`${asOf.slice(0, 7)}-01T00:00:00Z`)
  const months: Array<{ month: string; count: number }> = []
  for (let offset = 11; offset >= 0; offset--) {
    const date = new Date(end); date.setUTCMonth(date.getUTCMonth() - offset)
    months.push({ month: date.toISOString().slice(0, 7), count: 0 })
  }
  const counts = new Map(months.map(entry => [entry.month, entry]))
  for (const commit of commits) {
    const day = commit.timestamp.slice(0, 10)
    if ((startDate && day < startDate) || (endDate && day > endDate)) continue
    if (!commit.files.some(file => file.path === path)) continue
    const entry = counts.get(commit.timestamp.slice(0, 7)); if (entry) entry.count++
  }
  return months
}

function csvCell(value: unknown): string {
  let text = value === null || value === undefined ? "" : String(value)
  if (typeof value === "string" && /^[\s]*[=+\-@]/.test(text)) text = `'${text}`
  return `"${text.replace(/"/g, '""')}"`
}

export function makeCsv(headers: string[], rows: unknown[][]): string {
  return [headers, ...rows].map(row => row.map(csvCell).join(",")).join("\r\n")
}

export function markdownSummary(analysis: AnalysisResult): string {
  const repo = analysis.repoUrl.replace(/\/+$/, "").split("/").slice(-2).join("/")
  const top = analysis.churn.slice(0, 5).map(file => `- \`${file.path}\` — ${file.churnCount} commits; last touched ${file.lastTouched}`).join("\n") || "- No file-change records returned."
  const contributors = topContributors(analysis.commitLog).slice(0, 5).map(c => `- ${c.name} — ${c.commits} commits`).join("\n") || "- No contributor records returned."
  const caveats = [analysis.scan.historyTruncated && `History limited to ${analysis.scan.commitsAnalyzed.toLocaleString()} of the ${analysis.scan.commitLimit.toLocaleString()} commit cap; older history may be absent.`, analysis.scan.filesTruncated && "File-level analysis reached its cap.", analysis.scan.commitFilesTruncated && "Some commit file lists were capped.", analysis.scan.ownershipTruncated && "The ownership report reached its result cap.", analysis.scan.cochangeTruncated && "The co-change report reached its result cap.", analysis.scan.outlineTruncated && "The code outline reached its file cap."] .filter(Boolean)
  return `# Wot-Git repository report: ${repo}\n\nScanned: ${analysis.analyzedAt}\n\n## Frequently changed files\n${top}\n\n## Contributors by recorded Git identity\n${contributors}\n\n## Coverage notes\n${caveats.length ? caveats.map(x => `- ${x}`).join("\n") : "- No scan truncation was reported."}\n\nThese are Git-history signals to guide investigation, not confirmed defects or measures of code quality.\n`
}

export function downloadText(filename: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const link = document.createElement("a"); link.href = url; link.download = filename; link.click(); URL.revokeObjectURL(url)
}

export function downloadCsv(filename: string, analyzedAt: string, historyTruncated: boolean, commitFilesTruncated: boolean, headers: string[], rows: unknown[][]) {
  const completeHeaders = ["Scan date", "History truncated", "Commit file lists capped", "Other scan caps", ...headers]
  const otherCaps = "File and derived-result caps may apply; see the dashboard coverage notice."
  const completeRows = rows.length
    ? rows.map(row => [analyzedAt, historyTruncated, commitFilesTruncated, otherCaps, ...row])
    : [[analyzedAt, historyTruncated, commitFilesTruncated, otherCaps, ...headers.map(() => "")]]
  downloadText(filename, makeCsv(completeHeaders, completeRows), "text/csv;charset=utf-8")
}
