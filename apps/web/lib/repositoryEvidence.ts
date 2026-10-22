import type { CommitRecord } from "@wot-git/types"

export function commitsForFile(commits: CommitRecord[], path: string): CommitRecord[] {
  return commits
    .filter(commit => commit.files.some(file => file.path === path))
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp) || a.hash.localeCompare(b.hash))
}

export interface ContributorSummary {
  identity: string
  name: string
  commits: number
}

export function topContributors(commits: CommitRecord[], limit = 3): ContributorSummary[] {
  const contributors = new Map<string, ContributorSummary>()
  for (const commit of commits) {
    const identity = commit.authorEmail || commit.authorName || "Unknown author"
    const current = contributors.get(identity) ?? { identity, name: commit.authorName || commit.authorEmail || "Unknown author", commits: 0 }
    current.commits += 1
    contributors.set(identity, current)
  }
  return [...contributors.values()]
    .sort((a, b) => b.commits - a.commits || a.name.localeCompare(b.name) || a.identity.localeCompare(b.identity))
    .slice(0, limit)
}
