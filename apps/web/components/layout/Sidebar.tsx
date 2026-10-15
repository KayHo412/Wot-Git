"use client"
import {
  Flame, Bug, BarChart2, Activity, RefreshCw, LayoutDashboard,
  GitCommit, Users, Link2, FileCode, HeartPulse, BookOpen, ChevronDown,
  type LucideIcon,
} from "lucide-react"
import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"
import packageInfo from "../../package.json"

export type TabId =
  | "overview"
  | "hotspots"
  | "bugfiles"
  | "commits"
  | "commitsizes"
  | "churn"
  | "commitlog"
  | "ownership"
  | "cochange"
  | "outline"
  | "health"
  | "guide"

interface TabItem { id: TabId; label: string; icon: LucideIcon }

export const NAV_GROUPS: Array<{ id: string; label: string; icon: LucideIcon; items: TabItem[] }> = [
  { id: "overview", label: "Overview", icon: LayoutDashboard, items: [
    { id: "overview", label: "Repository overview", icon: LayoutDashboard },
  ] },
  { id: "code-change", label: "Code & Change", icon: Flame, items: [
  { id: "hotspots",    label: "Hotspots",        icon: Flame },
  { id: "churn",       label: "Churn",           icon: RefreshCw },
  { id: "cochange",    label: "Co-Change",       icon: Link2 },
  { id: "outline",     label: "Outline",         icon: FileCode },
  ] },
  { id: "commit-history", label: "Commit History", icon: GitCommit, items: [
    { id: "bugfiles",    label: "Bug Files",       icon: Bug },
    { id: "commits",     label: "Commit Activity", icon: BarChart2 },
    { id: "commitsizes", label: "Commit Sizes",    icon: Activity },
    { id: "commitlog",   label: "Commit Log",      icon: GitCommit },
  ] },
  { id: "contributors", label: "Contributors", icon: Users, items: [
    { id: "ownership", label: "Ownership", icon: Users },
  ] },
  { id: "repository", label: "Repository", icon: HeartPulse, items: [
    { id: "health", label: "Health", icon: HeartPulse },
  ] },
  { id: "help", label: "Help", icon: BookOpen, items: [
    { id: "guide", label: "Guide & Methodology", icon: BookOpen },
  ] },
]

export function groupForTab(tab: TabId): string {
  return NAV_GROUPS.find(group => group.items.some(item => item.id === tab))?.id ?? NAV_GROUPS[0].id
}

interface SidebarProps {
  activeTab?: TabId
  onSelectTab?: (tab: TabId) => void
  isOpen?: boolean
}

export function Sidebar({ activeTab = "hotspots", onSelectTab, isOpen = true }: SidebarProps) {
  const [expandedGroup, setExpandedGroup] = useState(() => groupForTab(activeTab))

  useEffect(() => {
    setExpandedGroup(groupForTab(activeTab))
  }, [activeTab])

  return (
    <aside id="dashboard-sidebar" aria-label="Repository navigation" className={`${isOpen ? "hidden lg:flex" : "hidden"} flex-col self-start h-screen min-h-0 w-[220px] shrink-0 overflow-y-auto border-r border-border sticky top-0 bg-bg`}>
      <div className="h-[57px] flex items-center px-4 border-b border-border">
        <span className="text-sm font-semibold text-primary tracking-tight">Wot-Git</span>
      </div>
      <nav aria-label="Repository analysis" className="flex flex-col gap-1 p-2 flex-1">
        {NAV_GROUPS.map(({ id, label, icon: Icon, items }) => {
          const isExpanded = expandedGroup === id
          const groupIsActive = items.some(item => item.id === activeTab)
          return (
            <section key={id}>
              <button
                type="button"
                aria-expanded={isExpanded}
                aria-controls={isExpanded ? `sidebar-group-${id}` : undefined}
                onClick={() => setExpandedGroup(current => current === id ? "" : id)}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors text-left w-full",
                  groupIsActive ? "text-primary font-medium" : "text-muted hover:text-primary hover:bg-surface"
                )}
              >
                <Icon size={14} className={groupIsActive ? "text-accent" : "text-muted"} />
                <span className="flex-1">{label}</span>
                <ChevronDown size={13} className={cn("transition-transform", isExpanded && "rotate-180")} />
              </button>
              <div id={`sidebar-group-${id}`} hidden={!isExpanded} className="ml-3 border-l border-border/70 pl-2">
                  {items.map(({ id: itemId, label: itemLabel, icon: ItemIcon }) => {
                    const isActive = activeTab === itemId
                    return (
                      <button
                        key={itemId}
                        type="button"
                        onClick={() => { setExpandedGroup(id); onSelectTab?.(itemId) }}
                        aria-current={isActive ? "page" : undefined}
                        className={cn(
                          "flex items-center gap-2 px-2.5 py-2 rounded-md text-[13px] transition-colors text-left w-full",
                          isActive
                            ? "bg-accent/15 text-accent font-semibold border-l-2 border-accent rounded-l-none"
                            : "text-muted hover:text-primary hover:bg-surface"
                        )}
                      >
                        <ItemIcon size={13} className={isActive ? "text-accent" : "text-muted"} />
                        <span>{itemLabel}</span>
                      </button>
                    )
                  })}
              </div>
            </section>
          )
        })}
      </nav>
      <footer className="border-t border-border p-3 text-[11px] text-muted">
        <div className="font-semibold text-primary">◈ Wot-Git</div>
        <div className="mt-0.5">Version {packageInfo.version}</div>
        <a className="mt-2 inline-flex hover:text-accent" href="https://github.com/KayHo412/Wot-Git/issues" target="_blank" rel="noreferrer">
          Feedback &amp; issues <span className="sr-only">(opens in a new tab)</span>
        </a>
      </footer>
    </aside>
  )
}
