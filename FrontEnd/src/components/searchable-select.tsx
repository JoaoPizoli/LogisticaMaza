"use client"

import { useState, useMemo, useRef, useEffect } from "react"
import { Search, X, ChevronDown, Check } from "lucide-react"
import { Input } from "@/components/ui/input"

interface SearchableSelectProps {
  options: string[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  emptyText?: string
  width?: string
  /** Optional function to derive a display label from the raw option/value string */
  displayLabel?: (raw: string) => string
}

export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = "Buscar...",
  emptyText = "Nenhum resultado",
  width = "w-[180px]",
  displayLabel,
}: SearchableSelectProps) {
  const getLabel = displayLabel ?? ((s: string) => s)
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  const filtered = useMemo(() => {
    if (!search) return options
    const term = search.toLowerCase()
    return options.filter((o) => getLabel(o).toLowerCase().includes(term))
  }, [options, search, getLabel])

  return (
    <div className="relative" ref={ref}>
      <div className="relative">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
        <Input
          placeholder={placeholder}
          value={open ? search : (value ? getLabel(value) : "")}
          onChange={(e) => {
            setSearch(e.target.value)
            if (!open) setOpen(true)
          }}
          onFocus={() => {
            setOpen(true)
            setSearch("")
          }}
          className={`h-8 ${width} text-xs pl-7 pr-7`}
        />
        {value && (
          <button
            type="button"
            onClick={() => {
              onChange("")
              setSearch("")
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-3 w-3" />
          </button>
        )}
        {!value && (
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground pointer-events-none" />
        )}
      </div>
      {open && (
        <div className={`absolute z-50 mt-1 ${width} max-h-[200px] overflow-y-auto rounded-md border bg-popover shadow-md`}>
          {filtered.length === 0 ? (
            <div className="px-3 py-2 text-xs text-muted-foreground">
              {emptyText}
            </div>
          ) : (
            filtered.map((option) => (
              <button
                key={option}
                type="button"
                className="flex w-full items-center gap-2 px-3 py-1.5 text-xs hover:bg-muted/50 transition-colors text-left cursor-pointer"
                onClick={() => {
                  onChange(option)
                  setSearch("")
                  setOpen(false)
                }}
              >
                {option === value && <Check className="h-3 w-3 text-primary" />}
                <span className={option === value ? "font-medium" : ""}>
                  {getLabel(option)}
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
