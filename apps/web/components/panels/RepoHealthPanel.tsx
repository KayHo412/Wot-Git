"use client"
import type { HealthCategory, HealthFinding, RepoHealthResult } from "@wot-git/types"
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { AlertTriangle, CheckCircle2, CircleHelp, ExternalLink, ShieldAlert } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ErrorState } from "@/components/shared/ErrorState"

interface RepoHealthPanelProps {
  data?: RepoHealthResult
  isError: boolean
  error?: Error | null
  onRetry: () => void
  owner: string
  repo: string
}

function statusVariant(category: HealthCategory) {
  if (category.status === "not_applicable") return "default" as const
  return category.status === "healthy" ? "success" as const : "warning" as const
}

function FindingRow({ finding, owner, repo }: { finding: HealthFinding; owner: string; repo: string }) {
  const Icon = finding.severity === "high" ? ShieldAlert : finding.severity === "warning" ? AlertTriangle : CircleHelp
  const iconClass = finding.severity === "high" ? "text-danger" : finding.severity === "warning" ? "text-warning" : "text-muted"
  const githubUrl = finding.path
    ? `https://github.com/${owner}/${repo}/blob/HEAD/${finding.path.split("/").map(encodeURIComponent).join("/")}${finding.line ? `#L${finding.line}` : ""}`
    : undefined

  return (
    <li className="flex items-start gap-3 border-b border-border/50 py-3 last:border-0">
      <Icon size={15} className={`${iconClass} mt-0.5 shrink-0`} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-primary">{finding.title}</span>
          <Badge variant={finding.severity === "high" ? "danger" : finding.severity === "warning" ? "warning" : "default"}>
            {finding.severity === "high" ? "Review soon" : finding.severity}
          </Badge>
        </div>
        <p className="mt-1 text-xs leading-5 text-muted">{finding.summary}</p>
        {finding.path && (
          githubUrl ? (
            <a className="mt-1 inline-flex max-w-full items-center gap-1 font-mono text-[11px] text-accent hover:underline" href={githubUrl} target="_blank" rel="noreferrer">
              <span className="truncate">{finding.path}{finding.line ? `:${finding.line}` : ""}</span>
              <ExternalLink size={11} className="shrink-0" aria-hidden="true" />
            </a>
          ) : <p className="mt-1 truncate font-mono text-[11px] text-muted">{finding.path}</p>
        )}
      </div>
    </li>
  )
}

function CategoryRow({ category }: { category: HealthCategory }) {
  const scoreText = category.score === null ? "Not applicable" : `${category.score}/100`
  const scoreColor = category.score === null ? "bg-border" : category.score >= 75 ? "bg-success" : category.score >= 50 ? "bg-warning" : "bg-danger"
  return (
    <div className="space-y-2 rounded-md border border-border/60 bg-bg/40 p-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-medium text-primary">{category.label}</h3>
        <Badge variant={statusVariant(category)}>{scoreText}</Badge>
      </div>
      {category.score !== null && (
        <div className="flex items-center gap-2" role="meter" aria-label={`${category.label} score`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={category.score}>
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-border">
            <div className={`h-full rounded-full transition-all ${scoreColor}`} style={{ width: `${category.score}%` }} />
          </div>
          <span className="w-10 text-right font-mono text-xs text-muted">{category.score}%</span>
        </div>
      )}
      <p className="text-xs leading-5 text-muted">{category.summary}</p>
    </div>
  )
}

export function RepoHealthPanel({ data, isError, error, onRetry, owner, repo }: RepoHealthPanelProps) {
  if (isError || !data) {
    return <ErrorState code={(error as (Error & { code?: string }) | null)?.code} message={error?.message} onRetry={onRetry} />
  }

  const scoreTone = data.overallScore >= 75 ? "text-success" : data.overallScore >= 50 ? "text-warning" : "text-danger"

  return (
    <div className="space-y-5">
      <Card>
        <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-semibold text-primary">Repository health</h2>
              <Badge>Project type: {data.projectType}</Badge>
            </div>
            <p className="mt-1 max-w-2xl text-xs leading-5 text-muted">
              Static signals from tracked files and Git history. This score is a review guide, not a guarantee of quality or runtime correctness.
            </p>
          </div>
          <div className="flex shrink-0 items-baseline gap-2 sm:justify-end">
            <span className={`font-mono text-4xl font-bold ${scoreTone}`}>{data.overallScore}</span>
            <span className="text-sm text-muted">/ 100</span>
          </div>
        </CardContent>
      </Card>

      <section aria-labelledby="health-categories-heading" className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 id="health-categories-heading" className="text-sm font-semibold text-primary">Health breakdown</h2>
            <p className="mt-1 text-xs text-muted">Applicable categories are weighted equally. Not-applicable checks are excluded.</p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {data.categories.map(category => <CategoryRow key={category.id} category={category} />)}
        </div>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Health changes by month</CardTitle>
          <p className="text-xs leading-5 text-muted">Monthly repository state and recent change-risk signals. Past secret values are not scanned or retained.</p>
        </CardHeader>
        <CardContent>
          {data.timeline.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted">No commit history was available to build a timeline.</p>
          ) : (
            <div className="h-[300px] w-full" role="img" aria-label="Monthly repository health scores and commit counts">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={data.timeline} margin={{ top: 8, right: 8, left: -18, bottom: 4 }}>
                  <CartesianGrid stroke="#30363d" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" stroke="#8b949e" fontSize={10} tickLine={false} minTickGap={32} />
                  <YAxis yAxisId="score" domain={[0, 100]} stroke="#8b949e" fontSize={10} tickLine={false} axisLine={false} width={30} />
                  <YAxis yAxisId="commits" orientation="right" stroke="#8b949e" fontSize={10} tickLine={false} axisLine={false} width={30} />
                  <Tooltip
                    content={({ active, payload, label }) => active && payload?.length ? (
                      <div className="rounded-md border border-border bg-surface px-3 py-2 text-xs shadow-lg">
                        <p className="mb-1 font-mono text-primary">{label}</p>
                        <p className="text-accent">Health score: {payload.find(item => item.dataKey === "overallScore")?.value ?? "—"}/100</p>
                        <p className="text-muted">Commits: {payload.find(item => item.dataKey === "commitCount")?.value ?? 0}</p>
                      </div>
                    ) : null}
                  />
                  <Bar yAxisId="commits" dataKey="commitCount" name="Commits" fill="#6e7681" radius={[2, 2, 0, 0]} />
                  <Line yAxisId="score" dataKey="overallScore" name="Health score" type="monotone" stroke="#2f81f7" strokeWidth={2} dot={data.timeline.length === 1 ? { r: 4 } : false} activeDot={{ r: 4 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted">
            <span><span className="mr-1 inline-block h-2 w-2 rounded-full bg-accent" />Health score</span>
            <span><span className="mr-1 inline-block h-2 w-2 rounded-sm bg-border" />Commits</span>
            <span>
              Health trends use {data.historyCommitsAnalyzed.toLocaleString()} of at most {data.historyCommitLimit.toLocaleString()} recent commits{data.historyTruncated ? "; older commits were omitted" : ""}.
              {" "}The chart shows at most the 120 most recent months{data.timelineTruncated ? "; older months were omitted" : "."}
            </span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Findings to review</CardTitle>
          <p className="text-xs text-muted">Signals are evidence for investigation, not proof that code is broken.</p>
        </CardHeader>
        <CardContent>
          {data.findings.length === 0 ? (
            <div className="flex items-center gap-2 py-4 text-sm text-success"><CheckCircle2 size={16} />No notable static findings.</div>
          ) : (
            <ul aria-label="Repository health findings">
              {data.findings.map(finding => <FindingRow key={finding.id} finding={finding} owner={owner} repo={repo} />)}
            </ul>
          )}
        </CardContent>
      </Card>

      <p className="text-[11px] leading-5 text-muted">
        Secret scanning checks only the current revision{data.secretScanTruncated ? " and reached its file or size limit" : ""}, and redacts matched values. Static checks do not run tests or verify deployed behavior.
      </p>
    </div>
  )
}
