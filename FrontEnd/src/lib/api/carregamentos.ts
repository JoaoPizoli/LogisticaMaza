import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/api"
import type { Carregamento, CidadeGrupo } from "@/types"

export type CreateCarregamentoPayload = {
  cidades_em_ordem: CidadeGrupo[]
  capacidade_maxima: number
  peso_total?: number
  rota_id?: number
  motorista_id?: number
  status?: string
}

export async function getAllCarregamentos(): Promise<Carregamento[]> {
  return apiGet<Carregamento[]>("/carregamento")
}

export async function getCarregamento(id: number): Promise<Carregamento> {
  return apiGet<Carregamento>(`/carregamento/${id}`)
}

export async function montarCarregamento(params: {
  rotaId?: number
  cidades?: number[]
}): Promise<CidadeGrupo[]> {
  const query = new URLSearchParams()
  if (params.rotaId) query.set("rotaId", String(params.rotaId))
  if (params.cidades && params.cidades.length > 0)
    query.set("cidades", params.cidades.join(","))
  return apiGet<CidadeGrupo[]>(`/carregamento/montar?${query.toString()}`)
}

export async function createCarregamento(
  data: CreateCarregamentoPayload,
): Promise<Carregamento> {
  return apiPost<Carregamento>("/carregamento", data)
}

export async function updateCarregamento(
  id: number,
  data: Partial<CreateCarregamentoPayload>,
): Promise<Carregamento> {
  return apiPatch<Carregamento>(`/carregamento/${id}`, data)
}

export async function finalizarCarregamento(
  id: number,
): Promise<Carregamento> {
  return apiPatch<Carregamento>(`/carregamento/finalizar/${id}`)
}

export async function enviarParaMotorista(
  id: number,
): Promise<Carregamento> {
  return apiPatch<Carregamento>(`/carregamento/enviar/${id}`)
}

export async function reenviarParaMotorista(
  id: number,
): Promise<Carregamento> {
  return apiPatch<Carregamento>(`/carregamento/reenviar/${id}`)
}

export async function addPedidoToCarregamento(
  id: number,
  numdoc: string,
): Promise<Carregamento> {
  return apiPost<Carregamento>(`/carregamento/${id}/add-pedido`, { numdoc })
}

export async function deleteCarregamento(id: number): Promise<void> {
  return apiDelete(`/carregamento/${id}`)
}
