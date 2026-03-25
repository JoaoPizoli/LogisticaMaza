"use client"

import React, { useState, useMemo } from "react"
import {
  Package,
  Weight,
  CheckCircle,
  Loader2,
  TrendingUp,
  ChevronRight,
  ChevronDown,
} from "lucide-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

import { PageTemplate } from "@/components/page-template"
import { PedidoFiltersBar } from "@/components/pedido-filters-bar"
import { BrazilHeatMap } from "@/components/brazil-heat-map"
import { usePedidos } from "@/hooks/use-pedidos"
import type { Pedido, PedidoFilters } from "@/types"
import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Cell,
} from "recharts"

// ─── MetricCard ──────────────────────────────────────────────────────────────

function MetricCard({
  title,
  value,
  description,
  icon: Icon,
  color,
}: {
  title: string
  value: string | number
  description: string
  icon: React.ComponentType<{ className?: string }>
  color: string
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className={`h-5 w-5 ${color}`} />
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      </CardContent>
    </Card>
  )
}

// ─── PedidoTable ─────────────────────────────────────────────────────────────

function PedidoTable({ pedidos }: { pedidos: Pedido[] }) {
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
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left">
            <th className="pb-3 pr-4 font-medium text-muted-foreground">NumDoc</th>
            <th className="pb-3 pr-4 font-medium text-muted-foreground">Cliente</th>
            <th className="pb-3 pr-4 font-medium text-muted-foreground hidden md:table-cell">Representante</th>
            <th className="pb-3 pr-4 font-medium text-muted-foreground hidden lg:table-cell">Cidade</th>
            <th className="pb-3 pr-4 font-medium text-muted-foreground">Peso (kg)</th>
            <th className="pb-3 pr-4 font-medium text-muted-foreground hidden sm:table-cell">Data</th>
            <th className="pb-3 font-medium text-muted-foreground hidden sm:table-cell">Hora</th>
          </tr>
        </thead>
        <tbody>
          {pedidos.map((pedido) => {
            const hasItens = pedido.itens && pedido.itens.length > 0
            const isExpanded = expandedRows.has(pedido.id)

            return (
              <React.Fragment key={pedido.id}>
                <tr className="border-b last:border-0 hover:bg-muted/50 transition-colors">
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
                  <td className="py-3 pr-4">{pedido.peso_bruto.toLocaleString("pt-BR")}</td>
                  <td className="py-3 pr-4 hidden sm:table-cell text-muted-foreground">
                    {new Date(pedido.data_emissao).toLocaleDateString("pt-BR")}
                  </td>
                  <td className="py-3 hidden sm:table-cell text-muted-foreground">
                    {pedido.hora_emissao}
                  </td>
                </tr>
                {hasItens && isExpanded && (
                  <tr key={`${pedido.id}-itens`} className="border-b last:border-0">
                    <td colSpan={7} className="py-2 px-4 bg-muted/30">
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

// ─── Chart colors ────────────────────────────────────────────────────────────

const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
]

// ─── Dashboard Page ──────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [filters, setFilters] = useState<PedidoFilters>({})
  const { pedidos, allPedidos, isLoading, representantes, estados, rotas } = usePedidos(filters)

  // Métricas
  const totalPedidos = pedidos.length
  const pesoTotal = useMemo(
    () => pedidos.reduce((sum, p) => sum + p.peso_bruto, 0),
    [pedidos]
  )
  const comBaixa = useMemo(
    () => pedidos.filter((p) => p.baixa_sistema).length,
    [pedidos]
  )

  // Dados para gráfico — pedidos por representante
  const chartData = useMemo(() => {
    const byRep: Record<string, number> = {}
    pedidos.forEach((p) => {
      byRep[p.nomven] = (byRep[p.nomven] || 0) + 1
    })
    return Object.entries(byRep)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
  }, [pedidos])

  // Dados para mapa de calor — pedidos por estado
  const pedidosPorEstado = useMemo(() => {
    const byUF: Record<string, number> = {}
    pedidos.forEach((p) => {
      const parts = p.cidade.split("-")
      const uf = parts.length >= 2 ? parts[parts.length - 1].trim() : ""
      if (uf) byUF[uf] = (byUF[uf] || 0) + 1
    })
    return byUF
  }, [pedidos])

  const recentes = useMemo(
    () =>
      [...pedidos]
        .sort((a, b) => {
          const dateDiff =
            new Date(b.data_emissao).getTime() -
            new Date(a.data_emissao).getTime()
          if (dateDiff !== 0) return dateDiff
          return (b.hora_emissao || "").localeCompare(a.hora_emissao || "")
        })
        .slice(0, 10),
    [pedidos]
  )

  // Peso formatado
  const pesoFormatado = useMemo(() => {
    if (pesoTotal >= 1000) {
      return `${(pesoTotal / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} ton`
    }
    return `${pesoTotal.toLocaleString("pt-BR", { maximumFractionDigits: 0 })} kg`
  }, [pesoTotal])

  // Filtros
  const hasActiveFilters =
    (filters.nomven && filters.nomven.length > 0) || !!filters.estado || !!filters.dataInicio || !!filters.dataFim || !!filters.rota
  const handleClear = () => setFilters({})

  if (isLoading) {
    return (
      <PageTemplate title="Dashboard" description="Carregando...">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </PageTemplate>
    )
  }

  return (
    <PageTemplate
      title="Dashboard"
      description="Visão geral dos pedidos do sistema de logística"
    >
      {/* Filtros */}
      <PedidoFiltersBar
        representantes={representantes}
        representante={filters.nomven || []}
        onRepresentanteChange={(v) =>
          setFilters((f) => ({ ...f, nomven: v.length > 0 ? v : undefined }))
        }
        estados={estados}
        estado={filters.estado || "TODOS"}
        onEstadoChange={(v) =>
          setFilters((f) => ({ ...f, estado: v === "TODOS" ? undefined : v }))
        }
        rotas={rotas}
        rota={filters.rota || "TODAS"}
        onRotaChange={(v) =>
          setFilters((f) => ({ ...f, rota: v === "TODAS" ? undefined : v }))
        }
        dataInicio={filters.dataInicio || ""}
        onDataInicioChange={(v) =>
          setFilters((f) => ({ ...f, dataInicio: v || undefined }))
        }
        dataFim={filters.dataFim || ""}
        onDataFimChange={(v) =>
          setFilters((f) => ({ ...f, dataFim: v || undefined }))
        }
        onClear={handleClear}
        hasActiveFilters={hasActiveFilters}
        infoText={
          hasActiveFilters
            ? `Exibindo ${pedidos.length} de ${allPedidos.length} pedidos`
            : `${pedidos.length} pedidos`
        }
      />

      {/* Metric Cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        <MetricCard
          title="Total de Pedidos"
          value={totalPedidos}
          description="Pedidos no período selecionado"
          icon={Package}
          color="text-amber-500"
        />
        <MetricCard
          title="Peso Total"
          value={pesoFormatado}
          description="Peso bruto acumulado"
          icon={Weight}
          color="text-blue-500"
        />
        <MetricCard
          title="Com Baixa"
          value={comBaixa}
          description="Pedidos com baixa no sistema"
          icon={CheckCircle}
          color="text-primary"
        />
      </div>

      {/* Gráfico + Mapa */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
        {/* Gráfico — Pedidos por Representante */}
        <Card>
          <CardHeader className="flex flex-row items-center gap-2 pb-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            <div>
              <CardTitle className="text-base">Pedidos por Representante</CardTitle>
              <CardDescription>
                Distribuição de pedidos entre os representantes
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {chartData.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Sem dados para exibir
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={chartData} margin={{ top: 5, right: 20, bottom: 60, left: 0 }} maxBarSize={40}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11 }}
                    angle={-35}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <RechartsTooltip
                    contentStyle={{
                      borderRadius: "8px",
                      border: "1px solid var(--border)",
                      fontSize: "12px",
                    }}
                  />
                  <Bar dataKey="value" name="Pedidos" radius={[4, 4, 0, 0]}>
                    {chartData.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={CHART_COLORS[index % CHART_COLORS.length]}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Mapa de calor — Pedidos por Estado */}
        <Card>
          <CardHeader className="flex flex-row items-center gap-2 pb-2">
            <Package className="h-5 w-5 text-primary" />
            <div>
              <CardTitle className="text-base">Pedidos por Estado</CardTitle>
              <CardDescription>
                Mapa de calor por unidade federativa
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <BrazilHeatMap data={pedidosPorEstado} />
          </CardContent>
        </Card>
      </div>

      {/* Tabs com tabelas */}
      {/* Pedidos Recentes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pedidos Recentes</CardTitle>
          <CardDescription>
            Os 10 pedidos mais recentes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PedidoTable pedidos={recentes} />
        </CardContent>
      </Card>
    </PageTemplate>
  )
}
