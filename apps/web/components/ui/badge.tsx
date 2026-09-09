import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-sm px-1.5 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default:  "bg-surface border border-border text-muted",
        danger:   "bg-danger/10 border border-danger/30 text-danger",
        warning:  "bg-warning/10 border border-warning/30 text-warning",
        success:  "bg-success/10 border border-success/30 text-success",
        accent:   "bg-accent/10 border border-accent/30 text-accent",
      },
    },
    defaultVariants: { variant: "default" },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
