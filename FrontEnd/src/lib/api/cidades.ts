import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/api"
import type { CidadeFull, ClientesOrdem } from "@/types"

export async function getAllCidades(): Promise<CidadeFull[]> {
  return apiGet<CidadeFull[]>("/cidade")
}

export async function getCidade(id: number): Promise<CidadeFull> {
  return apiGet<CidadeFull>(`/cidade/${id}`)
}

export async function createCidade(data: {
  nome: string
  ordem_entrega?: ClientesOrdem[]
}): Promise<CidadeFull> {
  return apiPost<CidadeFull>("/cidade", data)
}

export async function updateCidade(
  id: number,
  data: Partial<{
    nome: string
    ordem_entrega: ClientesOrdem[]
  }>,
): Promise<CidadeFull> {
  return apiPatch<CidadeFull>(`/cidade/${id}`, data)
}

export async function deleteCidade(id: number): Promise<void> {
  return apiDelete(`/cidade/${id}`)
}
