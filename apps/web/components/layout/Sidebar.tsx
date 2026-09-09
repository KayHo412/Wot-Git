"use client"
import {
  Flame, Bug, BarChart2, Activity, RefreshCw,
  GitCommit, Users, Link2, FileCode,
  type LucideIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"

export type TabId =
  | "hotspots"
  | "bugfiles"
  | "commits"
  | "commitsizes"
  | "churn"
  | "commitlog"
  | "ownership"
  | "cochange"
  | "outline"

export const TABS: Array<{ id: TabId; label: string; icon: LucideIcon }> = [
  { id: "hotspots",    label: "Hotspots",        icon: Flame },
  { id: "bugfiles",    label: "Bug Files",       icon: Bug },
  { id: "commits",     label: "Commit Activity", icon: BarChart2 },
  { id: "commitsizes", label: "Commit Sizes",    icon: Activity },
  { id: "churn",       label: "Churn",           icon: RefreshCw },
  { id: "commitlog",   label: "Commit Log",      icon: GitCommit },
  { id: "ownership",   label: "Ownership",       icon: Users },
  { id: "cochange",    label: "Co-Change",       icon: Link2 },
  { id: "outline",     label: "Outline",         icon: FileCode },
]

interface SidebarProps {
  activeTab?: TabId
  onSelectTab?: (tab: TabId) => void
}

export function Sidebar({ activeTab = "hotspots", onSelectTab }: SidebarProps) {
  return (
    <aside className="hidden lg:flex flex-col w-[220px] shrink-0 border-r border-border min-h-screen sticky top-0 bg-bg">
      <div className="h-[57px] flex items-center px-4 border-b border-border">
        <span className="text-sm font-semibold text-primary tracking-tight">RepoLens</span>
      </div>
      <nav className="flex flex-col gap-0.5 p-2 flex-1">
        {TABS.map(({ id, label, icon: Icon }) => {
          const isActive = activeTab === id
          return (
            <button
              key={id}
              type="button"
              onClick={() => onSelectTab?.(id)}
              className={cn(
                "flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors text-left w-full",
                isActive
                  ? "bg-accent/15 text-accent font-semibold border-l-2 border-accent rounded-l-none"
                  : "text-muted hover:text-primary hover:bg-surface"
              )}
            >
              <Icon size={14} className={isActive ? "text-accent" : "text-muted"} />
              <span>{label}</span>
            </button>
          )
        })}
      </nav>
    </aside>
  )
}
