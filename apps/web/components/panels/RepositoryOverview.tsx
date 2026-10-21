import type { DashboardResult } from "@wot-git/types"
import { ArrowRight, BookOpen, HeartPulse, Layers3 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { OverviewBar } from "@/components/panels/OverviewBar"
import type { TabId } from "@/components/layout/Sidebar"
import { SafeMarkdown } from "@/components/shared/SafeMarkdown"
import { InfoTip } from "@/components/shared/InfoTip"
import type { GuideSectionId } from "@/components/guide/guideTypes"

interface RepositoryOverviewProps {
  data: DashboardResult
  onSelectTab: (tab: TabId) => void
  onOpenGuide: (section: GuideSectionId) => void
}

const destinations: Array<{ id: TabId; title: string; description: string }> = [
  { id: "hotspots", title: "Hotspots", description: "Find frequently changed, larger files worth reviewing." },
  { id: "bugfiles", title: "Bug Files", description: "Review files linked to commits with bug-fix wording." },
  { id: "ownership", title: "Ownership", description: "See how commit contributions are distributed across files." },
  { id: "health", title: "Repository Health", description: "Review tests, docs, CI, secrets, containers, and trends." },
]

export function RepositoryOverview({ data, onSelectTab, onOpenGuide }: RepositoryOverviewProps) {
  const { overview, analysis, health } = data
  const repositoryName = analysis.repoUrl.split("/").filter(Boolean).slice(-1)[0] ?? "Repository"
  const owner = analysis.repoUrl.split("/").filter(Boolean).slice(-2)[0] ?? ""
  const totalCommits = analysis.commits.reduce((sum, entry) => sum + entry.count, 0)

  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-accent">Repository overview</p>
        <h1 className="text-2xl font-semibold tracking-tight text-primary">{owner}/{repositoryName}</h1>
        {overview.readmeTitle && overview.readmeTitle !== repositoryName && (
          <p className="text-xs text-muted">README title: <span className="text-primary">{overview.readmeTitle}</span></p>
        )}
        <p className="text-xs text-muted">
          <span className="inline-flex items-center gap-1">Static project-type estimate <InfoTip term="Project type" description="An estimate based on recognizable repository files and manifests. Wot-Git does not install or run the project to identify its type." guideSection="calculations" onOpenGuide={onOpenGuide} />:</span> <span className="capitalize text-primary">{health.projectType}</span>. Wot-Git reads Git history and recognizable files; it does not run the repository.
        </p>
      </section>

      <OverviewBar data={analysis} onOpenGuide={onOpenGuide} />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-sm"><HeartPulse size={15} className="text-accent" /> Health at a glance <InfoTip term="Repository Health score" description="A static checklist score averaged across applicable categories. It does not run tests or certify quality, security, or runtime behavior." guideSection="calculations" onOpenGuide={onOpenGuide} /></CardTitle></CardHeader>
          <CardContent className="flex items-center justify-between gap-4">
            <div>
              <div className="text-3xl font-semibold text-primary">{health.overallScore}<span className="text-base text-muted">/100</span></div>
              <p className="mt-1 text-xs text-muted">Static checklist score; it does not certify quality or security.</p>
            </div>
            <button type="button" onClick={() => onSelectTab("health")} className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-accent hover:text-primary">
              View Health <ArrowRight size={13} />
            </button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-sm"><Layers3 size={15} className="text-accent" /> What this report covers</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-xs leading-5 text-muted">
            <p>{totalCommits.toLocaleString()} commits are represented in the activity and change history panels.</p>
            <p>Hotspots, bug-associated files, ownership, and repository health are signals for review—not confirmed defects.</p>
            <button type="button" onClick={() => onSelectTab("guide")} className="inline-flex items-center gap-1 font-medium text-accent hover:text-primary">
              <BookOpen size={13} /> Read how to interpret results <ArrowRight size={13} />
            </button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">Explore this report</CardTitle></CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-2">
          {destinations.map(({ id, title, description }) => (
            <button key={id} type="button" onClick={() => onSelectTab(id)} className="group rounded-md border border-border p-3 text-left transition-colors hover:border-accent/50 hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
              <span className="flex items-center justify-between text-sm font-medium text-primary">{title}<ArrowRight size={14} className="text-muted transition-colors group-hover:text-accent" /></span>
              <span className="mt-1 block text-xs leading-5 text-muted">{description}</span>
            </button>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between gap-3 text-sm">
            <span>Repository README</span>
            {overview.readmePath && <span className="truncate text-xs font-normal text-muted">{overview.readmePath}</span>}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {overview.readmeContent
            ? <SafeMarkdown content={overview.readmeContent} imageBaseUrl={overview.readmeImageBaseUrl} />
            : <p className="text-sm leading-6 text-muted">{overview.readmePath
              ? `README found at ${overview.readmePath}, but it could not be displayed. It may be unreadable, unsupported, or larger than the 256 KB display limit.`
              : "This repository has no recognized README to display. The report below summarizes available repository history and detected project files."}</p>}
        </CardContent>
      </Card>
    </div>
  )
}
