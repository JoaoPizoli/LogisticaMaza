import { apiGet, apiPatch } from "@/lib/api"
import type { Pedido, PedidoFilters, Rota, Cidade } from "@/types"

function buildQuery(filters?: PedidoFilters): string {
  if (!filters) return ""
  const params = new URLSearchParams()
  if (filters.nomven?.length) filters.nomven.forEach(v => params.append("nomven", v))
  if (filters.dataInicio) params.append("data_inicio", filters.dataInicio)
  if (filters.dataFim) params.append("data_fim", filters.dataFim)
  if (filters.cidade) params.append("cidade", filters.cidade)
  if (filters.baixa_sistema !== undefined) params.append("baixa_sistema", filters.baixa_sistema)
  const qs = params.toString()
  return qs ? `?${qs}` : ""
}

export async function getPedidos(filters?: PedidoFilters): Promise<Pedido[]> {
  return apiGet<Pedido[]>(`/pedido${buildQuery(filters)}`)
}

export async function baixaPedido(numdoc: string): Promise<Pedido> {
  return apiPatch<Pedido>(`/pedido/baixa/${numdoc}`)
}

export async function getRotas(): Promise<Rota[]> {
  return apiGet<Rota[]>("/rota")
}

export async function getCidades(): Promise<Cidade[]> {
  return apiGet<Cidade[]>("/cidade/nomes")
}
