import { cn } from "@/lib/utils"

interface FilePathProps {
  path: string
  className?: string
  maxLength?: number
}

export function FilePath({ path, className, maxLength = 60 }: FilePathProps) {
  const display = path.length > maxLength ? "..." + path.slice(-(maxLength - 3)) : path
  return (
    <span
      className={cn("font-mono text-xs text-primary", className)}
      title={path}
    >
      {display}
    </span>
  )
}
