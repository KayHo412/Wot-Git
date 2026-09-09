"use client"
import { useQuery } from "@tanstack/react-query"
import { analyzeRepo } from "@/lib/api"

export function useAnalysis(owner: string, repo: string) {
  const repoUrl = `https://github.com/${owner}/${repo}`
  return useQuery({
    queryKey: ["analysis", owner, repo],
    queryFn: () => analyzeRepo(repoUrl),
    staleTime: 1000 * 60 * 60 * 24, // 24h — mirrors server cache
    retry: false,
  })
}
