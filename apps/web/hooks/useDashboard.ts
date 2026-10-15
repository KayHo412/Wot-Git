"use client"
import { useQuery } from "@tanstack/react-query"
import type { DashboardStreamMessage } from "@wot-git/types"
import { streamDashboardAnalysis } from "@/lib/api"

export function useDashboard(owner: string, repo: string, onMessage: (message: DashboardStreamMessage) => void) {
  const repoUrl = `https://github.com/${owner}/${repo}`
  return useQuery({
    queryKey: ["dashboard", owner, repo],
    queryFn: ({ signal }) => streamDashboardAnalysis(repoUrl, onMessage, signal),
    staleTime: 1000 * 60 * 60 * 6,
    retry: false,
  })
}
