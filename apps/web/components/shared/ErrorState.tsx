import { AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"

const MESSAGES: Record<string, string> = {
  REPO_NOT_FOUND:  "Repository not found or is private.",
  REPO_TOO_LARGE:  "This repository exceeds the configured commit limit.",
  REPO_SIZE_LIMIT: "The repository checkout exceeds the 1 GiB scan limit.",
  CLONE_TIMEOUT:   "The repository clone exceeded 60 seconds. Try a smaller repository.",
  SCAN_TIMEOUT:   "Repository analysis exceeded the 3 minute scan limit. Try a smaller repository.",
  INVALID_URL:     "Please enter a valid GitHub repository URL.",
  INTERNAL_ERROR:  "Something went wrong on our end. Please try again.",
}

interface ErrorStateProps {
  code?: string
  message?: string
  onRetry?: () => void
}

export function ErrorState({ code, message, onRetry }: ErrorStateProps) {
  const text = code ? MESSAGES[code] ?? message : message ?? "An unexpected error occurred."
  return (
    <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4 text-center px-4">
      <AlertTriangle className="text-danger" size={32} />
      <p className="text-sm text-muted max-w-md">{text}</p>
      {onRetry && <Button onClick={onRetry} variant="outline">Try again</Button>}
    </div>
  )
}
