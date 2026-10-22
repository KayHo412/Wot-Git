import assert from "node:assert/strict"
import { describe, it } from "node:test"
import type { AnalysisResult, CommitRecord } from "@wot-git/types"
import { filterCommits, filterCommitsByMonth, filterOwnershipByContributor, makeCsv, markdownSummary, monthlyFileActivity, periodComparison } from "./dashboardExploration"

const commit = (hash: string, timestamp: string, authorEmail: string, paths: string[]): CommitRecord => ({ hash, timestamp, authorEmail, authorName: authorEmail, message: "change", files: paths.map(path => ({ path, insertions: 1, deletions: 0 })), filesTruncated: false, isBugFix: false, matchedBugFixKeyword: null })

describe("dashboard exploration helpers", () => {
  const commits = [
    commit("new", "2026-10-22T10:00:00Z", "a@x", ["src/a.ts"]),
    commit("old", "2026-07-25T10:00:00Z", "b@x", ["src/a.ts", "src/b.ts"]),
    commit("outside", "2026-07-23T10:00:00Z", "c@x", ["src/a.ts"]),
  ]

  it("compares inclusive adjacent 90 day windows with per-file deltas", () => {
    const result = periodComparison(commits, "2026-10-22T00:00:00Z", false)
    assert.equal(result.recentStart, "2026-07-25")
    assert.equal(result.previousEnd, "2026-07-24")
    assert.equal(result.recent.commits, 2)
    assert.equal(result.previous.commits, 1)
    assert.equal(result.partial, false)
    assert.equal(periodComparison(commits, "2026-10-22", true).partial, true)
    assert.equal(periodComparison(commits, "2026-10-22", false, "src/b").recent.commits, 1)
  })

  it("generates twelve calendar months and counts selected file activity", () => {
    const months = monthlyFileActivity(commits, "src/a.ts", "2026-10-22T00:00:00Z")
    assert.equal(months.length, 12)
    assert.equal(months[0].month, "2025-11")
    assert.equal(months.at(-1)?.month, "2026-10")
    assert.equal(months.at(-1)?.count, 1)
    assert.equal(months.find(item => item.month === "2026-07")?.count, 2)
    assert.equal(monthlyFileActivity(commits, "src/a.ts", "2026-10-22", "2026-10-01", "2026-10-31").find(item => item.month === "2026-07")?.count, 0)
  })

  it("combines inclusive date and path filters", () => {
    assert.deepEqual(filterCommits(commits, { startDate: "2026-07-25", endDate: "2026-10-22", path: "src/a" }).map(c => c.hash), ["new", "old"])
  })

  it("filters file evidence by selected month and contributor identity", () => {
    assert.deepEqual(filterCommitsByMonth(commits, "2026-07").map(c => c.hash), ["old", "outside"])
    const ownership = [{ path: "src/a.ts", authors: ["a@x"], dominantAuthor: "a@x", isBusFactor: true }, { path: "src/b.ts", authors: ["b@x", "a@x"], dominantAuthor: "b@x", isBusFactor: false }]
    assert.deepEqual(filterOwnershipByContributor(ownership, "a@x").map(file => file.path), ["src/a.ts", "src/b.ts"])
  })

  it("escapes CSV quotes and protects formula-like values", () => {
    assert.equal(makeCsv(["path", "value"], [["src/with,comma.ts", "=SUM(A1)"]]), '"path","value"\r\n"src/with,comma.ts","\'=SUM(A1)"')
  })

  it("creates a concise Markdown report with coverage notes and no README", () => {
    const analysis = { repoUrl: "https://github.com/a/b", analyzedAt: "2026-10-22T00:00:00Z", churn: [{ path: "src/a.ts", churnCount: 2, lastTouched: "2026-10-22" }], commitLog: [], scan: { commitsAnalyzed: 3, commitLimit: 10000, historyTruncated: true, filesTruncated: false, commitFilesTruncated: false } } as unknown as AnalysisResult
    const report = markdownSummary(analysis)
    assert.match(report, /a\/b/)
    assert.match(report, /src\/a\.ts/)
    assert.match(report, /History limited/)
    assert.doesNotMatch(report, /README content/)
  })
})
