"use client"

export function FileInspectButton({ path, onInspect, selectedPath }: { path: string; onInspect?: (path: string) => void; selectedPath?: string | null }) {
  if (!onInspect) return null
  const isSelected = selectedPath === path
  return <button type="button" onClick={() => onInspect(path)} aria-label={isSelected ? `Currently inspecting ${path}` : `Inspect ${path}`} aria-pressed={isSelected} className={`ml-2 border-b text-[11px] underline-offset-2 focus-visible:outline focus-visible:outline-1 focus-visible:outline-accent ${isSelected ? "border-accent font-semibold text-accent" : "border-transparent text-muted hover:border-accent hover:text-accent"}`}>{isSelected ? "Inspecting" : "Inspect"}</button>
}
