"use client"

import { useState, useMemo, useRef, useEffect } from "react"
import { Search, X, ChevronDown, Check } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"

interface SearchableMultiSelectProps {
  options: string[]
  value: string[]
  onChange: (value: string[]) => void
  placeholder?: string
  emptyText?: string
  width?: string
}

export function SearchableMultiSelect({
  options,
  value,
  onChange,
  placeholder = "Buscar...",
  emptyText = "Nenhum resultado",
  width = "w-[180px]",
}: SearchableMultiSelectProps) {
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
    return options.filter((o) => o.toLowerCase().includes(term))
  }, [options, search])

  const toggleOption = (option: string) => {
    if (value.includes(option)) {
      onChange(value.filter((v) => v !== option))
    } else {
      onChange([...value, option])
    }
  }

  const displayText = value.length === 0
    ? ""
    : value.length === 1
      ? value[0]
      : `${value.length} selecionados`

  return (
    <div className="relative" ref={ref}>
      <div className="relative">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
        <Input
          placeholder={placeholder}
          value={open ? search : displayText}
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
        {value.length > 0 && (
          <button
            type="button"
            onClick={() => {
              onChange([])
              setSearch("")
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-3 w-3" />
          </button>
        )}
        {value.length === 0 && (
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
            filtered.map((option) => {
              const selected = value.includes(option)
              return (
                <button
                  key={option}
                  type="button"
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-xs hover:bg-muted/50 transition-colors text-left cursor-pointer"
                  onClick={() => toggleOption(option)}
                >
                  <div className={`h-3.5 w-3.5 rounded-sm border flex items-center justify-center shrink-0 ${
                    selected ? "bg-primary border-primary" : "border-muted-foreground/40"
                  }`}>
                    {selected && <Check className="h-2.5 w-2.5 text-primary-foreground" />}
                  </div>
                  <span className={selected ? "font-medium" : ""}>
                    {option}
                  </span>
                </button>
              )
            })
          )}
        </div>
      )}

      {value.length > 0 && (
        <div className="flex flex-wrap items-center gap-1 mt-1 max-w-[220px]">
          {value.slice(0, 2).map((v) => (
            <Badge key={v} variant="secondary" className="text-[10px] gap-1 py-0 h-5 max-w-[100px]">
              <span className="truncate">{v}</span>
              <button
                type="button"
                onClick={() => onChange(value.filter((x) => x !== v))}
                className="hover:text-destructive shrink-0"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </Badge>
          ))}
          {value.length > 2 && (
            <Badge variant="outline" className="text-[10px] py-0 h-5">
              +{value.length - 2}
            </Badge>
          )}
        </div>
      )}
    </div>
  )
}
