"use client"
import { useQuery } from "@tanstack/react-query"
import { analyzeDashboard } from "@/lib/api"

export function useDashboard(owner: string, repo: string) {
  const repoUrl = `https://github.com/${owner}/${repo}`
  return useQuery({
    queryKey: ["dashboard", owner, repo],
    queryFn: () => analyzeDashboard(repoUrl),
    staleTime: 1000 * 60 * 60 * 6,
    retry: false,
  })
}
