"use client"

import { useEffect, useId, useRef, useState } from "react"
import { Info } from "lucide-react"
import type { GuideSectionId } from "@/components/guide/guideTypes"

interface InfoTipProps {
  term: string
  description: string
  guideSection: GuideSectionId
  onOpenGuide: (section: GuideSectionId) => void
}

export function InfoTip({ term, description, guideSection, onOpenGuide }: InfoTipProps) {
  const [open, setOpen] = useState(false)
  const [alignRight, setAlignRight] = useState(false)
  const id = useId()
  const wrapperRef = useRef<HTMLSpanElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const pointerStarted = useRef(false)
  const suppressFocusOpen = useRef(false)

  useEffect(() => {
    if (!open) return
    const rect = triggerRef.current?.getBoundingClientRect()
    if (rect) setAlignRight(rect.left + Math.min(288, window.innerWidth - 32) > window.innerWidth - 16)
    const dismissOutside = (event: PointerEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener("pointerdown", dismissOutside)
    return () => document.removeEventListener("pointerdown", dismissOutside)
  }, [open])

  return (
    <span
      ref={wrapperRef}
      className="group relative inline-flex align-middle"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onKeyDown={event => {
        if (event.key === "Escape") {
          setOpen(false)
          suppressFocusOpen.current = true
          triggerRef.current?.focus()
        }
      }}
      onBlur={event => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false)
      }}
    >
      <button
        ref={triggerRef}
        type="button"
        aria-label={`About ${term}`}
        aria-expanded={open}
        aria-controls={id}
        aria-describedby={`${id}-description`}
        onPointerDown={event => {
          pointerStarted.current = true
          setOpen(true)
        }}
        onFocus={() => {
          if (suppressFocusOpen.current) {
            suppressFocusOpen.current = false
            return
          }
          if (!pointerStarted.current) setOpen(true)
        }}
        onClick={() => { pointerStarted.current = false }}
        className="inline-flex h-5 w-5 items-center justify-center text-muted hover:text-accent focus-visible:outline focus-visible:outline-1 focus-visible:outline-accent"
      >
        <Info size={12} aria-hidden="true" />
      </button>
      <span id={`${id}-description`} className="sr-only">{description}</span>
      <span
        id={id}
        role="group"
        aria-label={`${term} help`}
        hidden={!open}
        className={`absolute ${alignRight ? "right-0" : "left-0"} top-full z-40 w-64 max-w-[calc(100vw-2rem)] text-left text-xs font-normal leading-5 text-muted sm:w-72 ${open ? "block" : "hidden"}`}
      >
        <span className="block pt-2">
          <span className="block border border-border bg-surface p-3 shadow-lg">
            <span className="block">{description}</span>
            <button
              type="button"
              onClick={() => onOpenGuide(guideSection)}
              className="mt-2 border-b border-accent text-accent hover:text-primary focus-visible:outline focus-visible:outline-1 focus-visible:outline-accent"
            >
              Guide &amp; Methodology
            </button>
          </span>
        </span>
      </span>
    </span>
  )
}
