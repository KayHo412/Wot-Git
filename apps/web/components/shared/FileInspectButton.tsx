"use client"

export function FileInspectButton({ path, onInspect }: { path: string; onInspect?: (path: string) => void }) {
  if (!onInspect) return null
  return <button type="button" onClick={() => onInspect(path)} aria-label={`Inspect ${path}`} className="ml-2 text-[11px] text-muted underline-offset-2 hover:text-accent hover:underline focus-visible:outline focus-visible:outline-1 focus-visible:outline-accent">Inspect</button>
}
