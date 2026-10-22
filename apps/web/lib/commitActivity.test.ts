import assert from "node:assert/strict"
import { describe, it } from "node:test"
import type { CommitRecord } from "@wot-git/types"
import { commitsInDateRange } from "./commitActivity"

const records: CommitRecord[] = [
  { hash: "b", authorName: "B", authorEmail: "b@example.invalid", timestamp: "2026-06-02T10:00:00+03:00", message: "second", files: [], filesTruncated: false, isBugFix: false, matchedBugFixKeyword: null },
  { hash: "a", authorName: "A", authorEmail: "a@example.invalid", timestamp: "2026-06-01T23:00:00-04:00", message: "first", files: [], filesTruncated: false, isBugFix: false, matchedBugFixKeyword: null },
]

describe("commitsInDateRange", () => {
  it("includes both selected author-date boundaries", () => {
    assert.deepEqual(commitsInDateRange(records, "2026-06-01", "2026-06-01").map(commit => commit.hash), ["a"])
  })

  it("supports one-sided date ranges and no filter", () => {
    assert.deepEqual(commitsInDateRange(records, "2026-06-02", "").map(commit => commit.hash), ["b"])
    assert.equal(commitsInDateRange(records, "", "").length, 2)
  })

  it("returns no commits for a reversed or empty interval", () => {
    assert.deepEqual(commitsInDateRange(records, "2026-06-03", "2026-06-01"), [])
    assert.deepEqual(commitsInDateRange(records, "2026-06-03", "2026-06-03"), [])
  })
})
