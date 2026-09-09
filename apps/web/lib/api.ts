import type { AnalysisResult, AnalysisError } from "@repolens/types"

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001"

export async function analyzeRepo(repoUrl: string): Promise<AnalysisResult> {
  const res = await fetch(`${API_URL}/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ repoUrl }),
  })

  const data = await res.json()

  if (!res.ok) {
    const err = data as AnalysisError
    throw Object.assign(new Error(err.error), { code: err.code })
  }

  return data as AnalysisResult
}
