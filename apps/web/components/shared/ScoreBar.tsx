import { cn } from "@/lib/utils"

interface ScoreBarProps {
  value: number   // 0 to 1
  className?: string
}

function getColor(value: number) {
  if (value >= 0.7) return "bg-danger"
  if (value >= 0.4) return "bg-warning"
  return "bg-success"
}

export function ScoreBar({ value, className }: ScoreBarProps) {
  const pct = Math.round(value * 100)
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="flex-1 h-1.5 rounded-full bg-border overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all", getColor(value))}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="font-mono text-xs text-muted w-8 text-right">{value.toFixed(2)}</span>
    </div>
  )
}
