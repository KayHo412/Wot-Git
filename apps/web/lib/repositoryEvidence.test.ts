import assert from "node:assert/strict"
import { describe, it } from "node:test"
import type { CommitRecord } from "@wot-git/types"
import { commitsForFile, topContributors } from "./repositoryEvidence"

const records: CommitRecord[] = [
  { hash: "old", authorName: "Alex", authorEmail: "alex@example.invalid", timestamp: "2026-01-01T00:00:00Z", message: "old change", files: [{ path: "src/a.ts", insertions: 1, deletions: 0 }], filesTruncated: false, isBugFix: false, matchedBugFixKeyword: null },
  { hash: "new", authorName: "Alex", authorEmail: "alex@example.invalid", timestamp: "2026-02-01T00:00:00Z", message: "fix new behavior", files: [{ path: "src/a.ts", insertions: 3, deletions: 1 }], filesTruncated: false, isBugFix: true, matchedBugFixKeyword: "fix" },
  { hash: "other", authorName: "Sam", authorEmail: "sam@example.invalid", timestamp: "2026-02-02T00:00:00Z", message: "other", files: [{ path: "src/b.ts", insertions: 0, deletions: 0 }], filesTruncated: false, isBugFix: false, matchedBugFixKeyword: null },
]

describe("repository evidence summaries", () => {
  it("returns the selected file's commits newest first and none for missing paths", () => {
    assert.deepEqual(commitsForFile(records, "src/a.ts").map(commit => commit.hash), ["new", "old"])
    assert.deepEqual(commitsForFile(records, "src/missing.ts"), [])
  })

  it("ranks recorded author identities by commits with deterministic ties", () => {
    assert.deepEqual(topContributors(records).map(author => [author.identity, author.commits]), [
      ["alex@example.invalid", 2],
      ["sam@example.invalid", 1],
    ])
  })
})
