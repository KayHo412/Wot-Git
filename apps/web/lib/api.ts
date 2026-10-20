import type { AnalysisResult, AnalysisError, RepoHealthResult, DashboardResult, DashboardStreamMessage } from "@wot-git/types"

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

export async function analyzeRepoHealth(repoUrl: string): Promise<RepoHealthResult> {
  const res = await fetch(`${API_URL}/repo-health`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ repoUrl }),
  })

  const data = await res.json()
  if (!res.ok) {
    const err = data as AnalysisError
    throw Object.assign(new Error(err.error), { code: err.code })
  }
  return data as RepoHealthResult
}

export async function analyzeDashboard(repoUrl: string): Promise<DashboardResult> {
  const res = await fetch(`${API_URL}/dashboard`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ repoUrl }),
  })
  const data = await res.json()
  if (!res.ok) {
    const err = data as AnalysisError
    throw Object.assign(new Error(err.error), { code: err.code })
  }
  return data as DashboardResult
}

export async function streamDashboardAnalysis(
  repoUrl: string,
  onMessage: (message: DashboardStreamMessage) => void,
  signal?: AbortSignal,
  refresh = false,
): Promise<DashboardResult> {
  const res = await fetch(`${API_URL}/dashboard/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
    body: JSON.stringify({ repoUrl, refresh }),
    signal,
  })

  if (!res.ok) {
    const data = await res.json() as AnalysisError
    throw Object.assign(new Error(data.error), { code: data.code })
  }
  if (!res.body) throw new Error("The dashboard progress stream is unavailable. Please retry.")

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ""
  let result: DashboardResult | undefined

  const consumeFrame = (frame: string) => {
    const data = frame.split(/\r?\n/)
      .filter(line => line.startsWith("data:"))
      .map(line => line.slice(5).trimStart())
      .join("\n")
    if (!data) return
    const message = JSON.parse(data) as DashboardStreamMessage
    onMessage(message)
    if (message.type === "error") {
      throw Object.assign(new Error(message.error), { code: message.code })
    }
    if (message.type === "complete") result = message.result
  }

  try {
    while (true) {
      const { done, value } = await reader.read()
      buffer += decoder.decode(value, { stream: !done })
      let boundary = buffer.indexOf("\n\n")
      while (boundary >= 0) {
        const frame = buffer.slice(0, boundary)
        buffer = buffer.slice(boundary + 2)
        consumeFrame(frame)
        boundary = buffer.indexOf("\n\n")
      }
      if (done) break
    }
    if (buffer.trim()) consumeFrame(buffer)
  } finally {
    reader.releaseLock()
  }

  if (!result) throw new Error("The progress stream ended before the report was ready. Please retry.")
  return result
}
