import * as React from "react"
import { cn } from "@/lib/utils"

const Button = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "default" | "ghost" | "outline" }
>(({ className, variant = "default", ...props }, ref) => {
  const variants = {
    default: "bg-accent text-white hover:bg-accent/90",
    ghost:   "text-muted hover:text-primary hover:bg-surface",
    outline: "border border-border text-primary hover:bg-surface",
  }
  return (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium",
        "transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent",
        "disabled:pointer-events-none disabled:opacity-50",
        variants[variant], className
      )}
      {...props}
    />
  )
})
Button.displayName = "Button"
export { Button }
