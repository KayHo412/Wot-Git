"use client"
import { PanelLeftClose, PanelLeftOpen } from "lucide-react"

export function NavigationToggle({ isOpen, onToggle }: { isOpen: boolean; onToggle: () => void }) {
  const Icon = isOpen ? PanelLeftClose : PanelLeftOpen
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={isOpen ? "Hide navigation" : "Show navigation"}
      aria-expanded={isOpen}
      aria-controls="dashboard-sidebar mobile-analysis-nav"
      title={isOpen ? "Hide navigation" : "Show navigation"}
      className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted transition-colors hover:bg-surface hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
    >
      <Icon size={16} aria-hidden="true" />
    </button>
  )
}
