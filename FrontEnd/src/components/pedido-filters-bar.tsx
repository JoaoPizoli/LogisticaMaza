"use client"

import { Filter, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { SearchableMultiSelect } from "@/components/searchable-multi-select"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface PedidoFiltersBarProps {
  representantes: string[]
  representante: string[]
  onRepresentanteChange: (value: string[]) => void
  estados: string[]
  estado: string
  onEstadoChange: (value: string) => void
  rotas: string[]
  rota: string
  onRotaChange: (value: string) => void
  dataInicio: string
  onDataInicioChange: (value: string) => void
  dataFim: string
  onDataFimChange: (value: string) => void
  onClear: () => void
  hasActiveFilters: boolean
  infoText?: React.ReactNode
}

export function PedidoFiltersBar({
  representantes,
  representante,
  onRepresentanteChange,
  estados,
  estado,
  onEstadoChange,
  rotas,
  rota,
  onRotaChange,
  dataInicio,
  onDataInicioChange,
  dataFim,
  onDataFimChange,
  onClear,
  hasActiveFilters,
  infoText,
}: PedidoFiltersBarProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <Filter className="h-3.5 w-3.5 text-muted-foreground shrink-0" />

        <div className="flex items-center gap-1">
          <span className="text-[10px] text-muted-foreground">Representante:</span>
          <SearchableMultiSelect
            options={representantes}
            value={representante}
            onChange={onRepresentanteChange}
            placeholder="Buscar representante..."
            emptyText="Nenhum representante encontrado"
            width="w-[220px]"
          />
        </div>

        <div className="flex items-center gap-1">
          <span className="text-[10px] text-muted-foreground">Estado:</span>
          <Select
            value={estado}
            onValueChange={(v) => onEstadoChange(v ?? "TODOS")}
          >
            <SelectTrigger className="h-8 w-[120px] text-xs">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent className="max-h-[200px]">
              <SelectItem value="TODOS">Todos</SelectItem>
              {estados.map((e) => (
                <SelectItem key={e} value={e}>
                  {e}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-1">
          <span className="text-[10px] text-muted-foreground">Rotas:</span>
          <Select
            value={rota}
            onValueChange={(v) => onRotaChange(v ?? "TODAS")}
          >
            <SelectTrigger className="h-8 w-[200px] text-xs">
              <SelectValue placeholder="Rota" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="TODAS">Todas as Rotas</SelectItem>
              {rotas.map((r) => (
                <SelectItem key={r} value={r}>
                  {r}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Input
          type="date"
          value={dataInicio}
          onChange={(e) => onDataInicioChange(e.target.value)}
          className="h-8 w-[155px] text-xs"
          title="Data início"
        />

        <span className="text-xs text-muted-foreground">até</span>

        <Input
          type="date"
          value={dataFim}
          onChange={(e) => onDataFimChange(e.target.value)}
          className="h-8 w-[155px] text-xs"
          title="Data fim"
        />

        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs px-2"
            onClick={onClear}
          >
            <X className="h-3 w-3 mr-1" />
            Limpar
          </Button>
        )}

        {infoText && (
          <span className="ml-auto text-xs text-muted-foreground hidden sm:inline">
            {infoText}
          </span>
        )}
      </div>

      {infoText && (
        <span className="text-xs text-muted-foreground sm:hidden">
          {infoText}
        </span>
      )}
    </div>
  )
}
