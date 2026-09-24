"use client"
import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, Loader2 } from "lucide-react"

interface RepoSuggestion {
  id: number
  full_name: string
  description: string | null
}

const EXAMPLES = ["expressjs/express", "facebook/react", "vercel/next.js"]

function parseGithubUrl(value: string): { owner: string; repo: string } | null {
  try {
    const url = value.startsWith("http") ? value : `https://github.com/${value}`
    const parsed = new URL(url)
    if (parsed.hostname !== "github.com") return null
    const parts = parsed.pathname.split("/").filter(Boolean)
    if (parts.length < 2) return null
    return { owner: parts[0], repo: parts[1].replace(/\.git$/, "") }
  } catch { return null }
}

export default function LandingPage() {
  const router = useRouter()
  const [value, setValue] = useState("")
  const [error, setError] = useState("")
  const [suggestions, setSuggestions] = useState<RepoSuggestion[]>([])
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Debounced GitHub search
  useEffect(() => {
    const trimmed = value.trim()
    // Don't search if value is full URL or less than 2 characters
    if (trimmed.length < 2 || trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
      setSuggestions([])
      setShowDropdown(false)
      return
    }

    const timer = setTimeout(async () => {
      setIsLoadingSuggestions(true)
      try {
        const res = await fetch(
          `https://api.github.com/search/repositories?q=${encodeURIComponent(trimmed)}&per_page=5`
        )
        if (!res.ok) {
          // Fail silently on rate limit or other API errors
          setSuggestions([])
          setShowDropdown(false)
          return
        }
        const data = await res.json()
        if (Array.isArray(data.items) && data.items.length > 0) {
          setSuggestions(
            data.items.slice(0, 5).map((item: any) => ({
              id: item.id,
              full_name: item.full_name,
              description: item.description,
            }))
          )
          setShowDropdown(true)
        } else {
          setSuggestions([])
          setShowDropdown(false)
        }
      } catch {
        // Fail silently
        setSuggestions([])
        setShowDropdown(false)
      } finally {
        setIsLoadingSuggestions(false)
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [value])

  // Click outside to dismiss
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  useEffect(() => {
    if (!isAnalyzing) return

    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = ""
    }
  }, [isAnalyzing])

  function handleSubmit(e?: React.FormEvent) {
    if (e) e.preventDefault()
    setShowDropdown(false)
    const parsed = parseGithubUrl(value.trim())
    if (!parsed) { setError("Please enter a valid GitHub repository URL or owner/repo."); return }
    setError("")
    setIsAnalyzing(true)
    router.push(`/r/${parsed.owner}/${parsed.repo}`)
  }

  function handleSelectSuggestion(fullName: string) {
    setValue(fullName)
    setShowDropdown(false)
    const [owner, repo] = fullName.split("/")
    if (owner && repo) {
      setIsAnalyzing(true)
      router.push(`/r/${owner}/${repo}`)
    }
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-xl flex flex-col gap-8">
        {/* Logo */}
        <div className="text-center">
          <div className="text-3xl font-semibold text-primary tracking-tight mb-2">◈ Wot-Git</div>
          <p className="text-sm text-muted">Analyze any public GitHub repository — hotspots, churn, bugs, and ownership.</p>
        </div>

        {/* Search Container with Autocomplete */}
        <div ref={containerRef} className="relative">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <Input
                className="pl-9 pr-8"
                placeholder="https://github.com/owner/repo or owner/repo"
                value={value}
                onChange={e => { setValue(e.target.value); setError("") }}
                onFocus={() => { if (suggestions.length > 0) setShowDropdown(true) }}
                onKeyDown={e => {
                  if (e.key === "Escape") {
                    setShowDropdown(false)
                  }
                }}
                autoFocus
                disabled={isAnalyzing}
              />
              {isLoadingSuggestions && (
                <Loader2 size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted animate-spin" />
              )}
            </div>
            <Button type="submit" disabled={isAnalyzing || !value.trim()}>
              {isAnalyzing ? <><Loader2 className="animate-spin" /> Analyzing...</> : "Analyze"}
            </Button>
          </form>

          {/* Autocomplete Dropdown */}
          {showDropdown && suggestions.length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-1.5 z-20 rounded-md border border-border bg-surface shadow-2xl overflow-hidden divide-y divide-border/40">
              {suggestions.map(s => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => handleSelectSuggestion(s.full_name)}
                  className="w-full text-left px-3.5 py-2.5 hover:bg-surface/80 transition-colors flex flex-col gap-0.5 group"
                >
                  <span className="text-xs font-mono font-semibold text-primary group-hover:text-accent transition-colors">
                    {s.full_name}
                  </span>
                  {s.description && (
                    <span className="text-[11px] text-muted truncate w-full">
                      {s.description}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {error && <p className="text-xs text-danger -mt-4">{error}</p>}

        {/* Examples */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted">Try:</span>
          {EXAMPLES.map(ex => (
            <button
              key={ex}
              onClick={() => { setValue(ex); setShowDropdown(false) }}
              className="text-xs font-mono text-accent hover:underline"
            >
              {ex}
            </button>
          ))}
        </div>
      </div>
    </main>
  )
}
