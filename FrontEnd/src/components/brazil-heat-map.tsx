"use client"

import React, { useMemo, useState, useCallback } from "react"
import {
  ComposableMap,
  Geographies,
  Geography,
} from "react-simple-maps"

const GEO_URL = "/brazil-states.json"

const STATE_NAMES: Record<string, string> = {
  AC: "Acre", AL: "Alagoas", AM: "Amazonas", AP: "Amapá",
  BA: "Bahia", CE: "Ceará", DF: "Distrito Federal", ES: "Espírito Santo",
  GO: "Goiás", MA: "Maranhão", MG: "Minas Gerais", MS: "Mato Grosso do Sul",
  MT: "Mato Grosso", PA: "Pará", PB: "Paraíba", PE: "Pernambuco",
  PI: "Piauí", PR: "Paraná", RJ: "Rio de Janeiro", RN: "Rio Grande do Norte",
  RO: "Rondônia", RR: "Roraima", RS: "Rio Grande do Sul", SC: "Santa Catarina",
  SE: "Sergipe", SP: "São Paulo", TO: "Tocantins",
}

function getHeatColor(value: number, max: number): string {
  if (max === 0 || value === 0) return "#e2e8f0"
  const ratio = Math.min(value / max, 1)
  const r = Math.round(254 - ratio * 34)
  const g = Math.round(226 - ratio * 186)
  const b = Math.round(226 - ratio * 186)
  return `rgb(${r}, ${g}, ${b})`
}

interface BrazilHeatMapProps {
  data: Record<string, number>
}

export function BrazilHeatMap({ data }: BrazilHeatMapProps) {
  const [tooltip, setTooltip] = useState<{
    name: string
    uf: string
    count: number
    x: number
    y: number
  } | null>(null)

  const maxValue = useMemo(
    () => Math.max(...Object.values(data), 0),
    [data]
  )

  const totalStatesWithData = useMemo(
    () => Object.values(data).filter((v) => v > 0).length,
    [data]
  )

  const handleMouseEnter = useCallback(
    (geo: { properties: { SIGLA: string } }, event: React.MouseEvent) => {
      const uf = geo.properties.SIGLA
      const count = data[uf] || 0
      const name = STATE_NAMES[uf] || uf
      setTooltip({ name, uf, count, x: event.clientX, y: event.clientY })
    },
    [data]
  )

  const handleMouseMove = useCallback((event: React.MouseEvent) => {
    setTooltip((prev) =>
      prev ? { ...prev, x: event.clientX, y: event.clientY } : null
    )
  }, [])

  const handleMouseLeave = useCallback(() => {
    setTooltip(null)
  }, [])

  return (
    <div className="relative w-full">
      <ComposableMap
        projection="geoMercator"
        projectionConfig={{
          scale: 350,
          center: [-54, -15],
        }}
        width={500}
        height={340}
        style={{ width: "100%", height: "auto" }}
      >
        <Geographies geography={GEO_URL}>
          {({ geographies }) =>
            geographies.map((geo) => {
              const uf = geo.properties.SIGLA as string
              const count = data[uf] || 0
              const fill = getHeatColor(count, maxValue)

              return (
                <Geography
                  key={geo.rpiavpropid || uf}
                  geography={geo}
                  fill={fill}
                  stroke="#94a3b8"
                  strokeWidth={0.5}
                  style={{
                    default: { outline: "none" },
                    hover: { outline: "none", fill, opacity: 0.75, strokeWidth: 1.5 },
                    pressed: { outline: "none" },
                  }}
                  onMouseEnter={(e) => handleMouseEnter(geo, e)}
                  onMouseMove={handleMouseMove}
                  onMouseLeave={handleMouseLeave}
                />
              )
            })
          }
        </Geographies>
      </ComposableMap>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="pointer-events-none fixed z-50 rounded-lg border bg-popover px-3 py-1.5 text-sm shadow-md text-popover-foreground"
          style={{
            left: tooltip.x + 12,
            top: tooltip.y - 32,
          }}
        >
          <span className="font-semibold">{tooltip.name}</span>
          <span className="text-muted-foreground ml-1">({tooltip.uf})</span>
          <span className="ml-2">{tooltip.count} pedido{tooltip.count !== 1 ? "s" : ""}</span>
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center justify-between mt-1 px-2">
        <div className="flex items-center gap-2">
          <div className="flex h-3 w-32 rounded-sm overflow-hidden">
            <div
              className="h-full w-full"
              style={{
                background: "linear-gradient(to right, #e2e8f0, rgb(220, 40, 40))",
              }}
            />
          </div>
          <span className="text-xs text-muted-foreground">
            0 — {maxValue} pedidos
          </span>
        </div>
        <span className="text-xs text-muted-foreground">
          {totalStatesWithData} estado{totalStatesWithData !== 1 ? "s" : ""} com pedidos
        </span>
      </div>
    </div>
  )
}
