"use client"
import { useQuery } from "@tanstack/react-query"
import { analyzeRepoHealth } from "@/lib/api"

export function useRepoHealth(owner: string, repo: string, enabled: boolean) {
  const repoUrl = `https://github.com/${owner}/${repo}`
  return useQuery({
    queryKey: ["repo-health", owner, repo],
    queryFn: () => analyzeRepoHealth(repoUrl),
    enabled,
    staleTime: 1000 * 60 * 60 * 6,
    retry: false,
  })
}
