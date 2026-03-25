"use client"

import React, { useState, useCallback } from "react"
import {
  Package,
  Loader2,
  Filter,
  X,
  Check,
  ChevronRight,
  ChevronDown,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { SearchableSelect } from "@/components/searchable-select"
import { SearchableMultiSelect } from "@/components/searchable-multi-select"

import { PageTemplate } from "@/components/page-template"
import { usePedidos } from "@/hooks/use-pedidos"
import { baixaPedido } from "@/lib/api/pedidos"
import type { Pedido, PedidoFilters } from "@/types"

// ─── PedidosTable ───────────────────────────────────────────────────────────

function PedidosTable({
  pedidos,
  onBaixa,
  loadingBaixa,
}: {
  pedidos: Pedido[]
  onBaixa: (numdoc: string) => void
  loadingBaixa: string | null
}) {
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set())

  const toggleRow = (id: number) => {
    setExpandedRows((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  if (pedidos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
        <Package className="h-10 w-10 mb-2" />
        <p className="text-sm">Nenhum pedido encontrado</p>
      </div>
    )
  }

  return (
    <div className="overflow-auto max-h-[60vh]">
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-card z-10">
          <tr className="border-b text-left">
            <th className="pb-3 pr-4 font-medium text-muted-foreground">NumDoc</th>
            <th className="pb-3 pr-4 font-medium text-muted-foreground">Cliente</th>
            <th className="pb-3 pr-4 font-medium text-muted-foreground hidden md:table-cell">Representante</th>
            <th className="pb-3 pr-4 font-medium text-muted-foreground hidden lg:table-cell">Cidade</th>
            <th className="pb-3 pr-4 font-medium text-muted-foreground">Peso (kg)</th>
            <th className="pb-3 pr-4 font-medium text-muted-foreground hidden sm:table-cell">Data</th>
            <th className="pb-3 pr-4 font-medium text-muted-foreground">Status</th>
            <th className="pb-3 font-medium text-muted-foreground">Ação</th>
          </tr>
        </thead>
        <tbody>
          {pedidos.map((pedido) => {
            const hasItens = pedido.itens && pedido.itens.length > 0
            const isExpanded = expandedRows.has(pedido.id)

            return (
              <React.Fragment key={pedido.id}>
                <tr
                  className="border-b last:border-0 hover:bg-muted/50 transition-colors"
                >
                  <td className="py-3 pr-4 font-medium">
                    <div className="flex items-center gap-1">
                      {hasItens ? (
                        <button
                          onClick={() => toggleRow(pedido.id)}
                          className="p-0.5 rounded hover:bg-muted cursor-pointer"
                        >
                          {isExpanded ? (
                            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                          )}
                        </button>
                      ) : (
                        <span className="w-4.5" />
                      )}
                      {pedido.numdoc}
                    </div>
                  </td>
                  <td className="py-3 pr-4 max-w-[180px] truncate">{pedido.nomcli}</td>
                  <td className="py-3 pr-4 hidden md:table-cell text-muted-foreground">
                    {pedido.nomven}
                  </td>
                  <td className="py-3 pr-4 hidden lg:table-cell text-muted-foreground">
                    {pedido.cidade}
                  </td>
                  <td className="py-3 pr-4">
                    {pedido.peso_bruto.toLocaleString("pt-BR")}
                  </td>
                  <td className="py-3 pr-4 hidden sm:table-cell text-muted-foreground">
                    {new Date(pedido.data_emissao).toLocaleDateString("pt-BR")}
                  </td>
                  <td className="py-3 pr-4">
                    {pedido.baixa_sistema ? (
                      <Badge variant="default" className="text-[10px]">Baixado</Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px]">Pendente</Badge>
                    )}
                  </td>
                  <td className="py-3">
                    {!pedido.baixa_sistema && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs cursor-pointer"
                        disabled={loadingBaixa === pedido.numdoc}
                        onClick={() => onBaixa(pedido.numdoc)}
                      >
                        {loadingBaixa === pedido.numdoc ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Check className="h-3 w-3 mr-1" />
                        )}
                        Dar Baixa
                      </Button>
                    )}
                  </td>
                </tr>
                {hasItens && isExpanded && (
                  <tr key={`${pedido.id}-itens`} className="border-b last:border-0">
                    <td colSpan={8} className="py-2 px-4 bg-muted/30">
                      <div className="pl-6 space-y-1">
                        {pedido.itens!.map((item, idx) => (
                          <div key={idx} className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span className="font-medium text-foreground">
                              {item.qtdite}x
                            </span>
                            <span>{item.descri}</span>
                          </div>
                        ))}
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ─── Pedidos Page ───────────────────────────────────────────────────────────

export default function PedidosPage() {
  const [filters, setFilters] = useState<PedidoFilters>({
    baixa_sistema: "false",
  })
  const { pedidos, allPedidos, isLoading, representantes, cidades, estados, refetch } =
    usePedidos(filters)
  const [loadingBaixa, setLoadingBaixa] = useState<string | null>(null)

  const handleBaixa = useCallback(
    async (numdoc: string) => {
      setLoadingBaixa(numdoc)
      try {
        await baixaPedido(numdoc)
        await refetch()
      } catch {
        // erro silencioso — o usuário verá que o pedido não sumiu da lista
      } finally {
        setLoadingBaixa(null)
      }
    },
    [refetch]
  )

  const hasActiveFilters =
    !!filters.numdoc ||
    (filters.nomven && filters.nomven.length > 0) ||
    !!filters.cidade ||
    !!filters.estado ||
    filters.baixa_sistema !== "false"

  const handleClear = () => setFilters({ baixa_sistema: "false" })

  const statusLabel =
    filters.baixa_sistema === "false"
      ? "Não Baixados"
      : filters.baixa_sistema === "true"
        ? "Baixados"
        : "Todos"

  if (isLoading) {
    return (
      <PageTemplate title="Pedidos" description="Carregando...">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </PageTemplate>
    )
  }

  return (
    <PageTemplate
      title="Pedidos"
      description="Pesquise e gerencie a baixa de pedidos no sistema"
    >
      {/* Filtros */}
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Filter className="h-3.5 w-3.5 text-muted-foreground shrink-0" />

          {/* NumDoc */}
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-muted-foreground">NumDoc:</span>
            <Input
              type="text"
              value={filters.numdoc || ""}
              onChange={(e) =>
                setFilters((f) => ({ ...f, numdoc: e.target.value || undefined }))
              }
              placeholder="Buscar NumDoc..."
              className="h-8 w-[140px] text-xs"
            />
          </div>

          {/* Representante */}
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-muted-foreground">Representante:</span>
            <SearchableMultiSelect
              options={representantes}
              value={filters.nomven || []}
              onChange={(v) =>
                setFilters((f) => ({ ...f, nomven: v.length > 0 ? v : undefined }))
              }
              placeholder="Buscar representante..."
              emptyText="Nenhum representante encontrado"
              width="w-[220px]"
            />
          </div>

          {/* Estado */}
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-muted-foreground">Estado:</span>
            <Select
              value={filters.estado || "TODOS"}
              onValueChange={(v) =>
                setFilters((f) => ({
                  ...f,
                  estado: v === "TODOS" ? undefined : v || undefined,
                }))
              }
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

          {/* Cidade */}
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-muted-foreground">Cidade:</span>
            <SearchableSelect
              options={cidades}
              value={filters.cidade || ""}
              onChange={(v) =>
                setFilters((f) => ({ ...f, cidade: v || undefined }))
              }
              placeholder="Buscar cidade..."
              emptyText="Nenhuma cidade encontrada"
              width="w-[180px]"
            />
          </div>

          {/* Status Baixa */}
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-muted-foreground">Status:</span>
            <Select
              value={
                filters.baixa_sistema === "false"
                  ? "Não Baixados"
                  : filters.baixa_sistema === "true"
                    ? "Baixados"
                    : "Todos"
              }
              onValueChange={(v) =>
                setFilters((f) => ({
                  ...f,
                  baixa_sistema:
                    v === "Não Baixados" ? "false" : v === "Baixados" ? "true" : undefined,
                }))
              }
            >
              <SelectTrigger className="h-8 w-[160px] text-xs">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Não Baixados">Não Baixados</SelectItem>
                <SelectItem value="Baixados">Baixados</SelectItem>
                <SelectItem value="Todos">Todos</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs px-2"
              onClick={handleClear}
            >
              <X className="h-3 w-3 mr-1" />
              Limpar
            </Button>
          )}

          <span className="ml-auto text-xs text-muted-foreground hidden sm:inline">
            {pedidos.length} pedidos — {statusLabel}
          </span>
        </div>

        <span className="text-xs text-muted-foreground sm:hidden">
          {pedidos.length} pedidos — {statusLabel}
        </span>
      </div>

      {/* Tabela */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pedidos</CardTitle>
        </CardHeader>
        <CardContent>
          <PedidosTable
            pedidos={pedidos}
            onBaixa={handleBaixa}
            loadingBaixa={loadingBaixa}
          />
        </CardContent>
      </Card>
    </PageTemplate>
  )
}
