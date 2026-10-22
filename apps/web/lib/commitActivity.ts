import type { CommitRecord } from "@wot-git/types"

export function commitsInDateRange(commits: CommitRecord[], startDate: string, endDate: string): CommitRecord[] {
  if (startDate && endDate && startDate > endDate) return []
  return commits.filter(commit => {
    const authorDate = commit.timestamp.slice(0, 10)
    return (!startDate || authorDate >= startDate) && (!endDate || authorDate <= endDate)
  })
}
