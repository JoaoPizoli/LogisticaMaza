import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/api"
import type { Rota } from "@/types"

export type CreateRotaPayload = {
  nome: string
  ordem_cidades: { cidade_id: number; ordem: number }[]
}

export async function getAllRotas(): Promise<Rota[]> {
  return apiGet<Rota[]>("/rota")
}

export async function getRota(id: number): Promise<Rota> {
  return apiGet<Rota>(`/rota/${id}`)
}

export async function createRota(data: CreateRotaPayload): Promise<Rota> {
  return apiPost<Rota>("/rota", data)
}

export async function updateRota(
  id: number,
  data: Partial<CreateRotaPayload>,
): Promise<Rota> {
  return apiPatch<Rota>(`/rota/${id}`, data)
}

export async function deleteRota(id: number): Promise<void> {
  return apiDelete(`/rota/${id}`)
}
