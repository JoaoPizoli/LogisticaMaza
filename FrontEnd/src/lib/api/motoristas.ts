import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/api"
import type { Motorista } from "@/types"

export type CreateMotoristaPayload = {
  nome: string
  telefone?: string
}

export async function getAllMotoristas(): Promise<Motorista[]> {
  return apiGet<Motorista[]>("/motorista")
}

export async function getMotorista(id: number): Promise<Motorista> {
  return apiGet<Motorista>(`/motorista/${id}`)
}

export async function createMotorista(
  data: CreateMotoristaPayload,
): Promise<Motorista> {
  return apiPost<Motorista>("/motorista", data)
}

export async function updateMotorista(
  id: number,
  data: Partial<CreateMotoristaPayload>,
): Promise<Motorista> {
  return apiPatch<Motorista>(`/motorista/${id}`, data)
}

export async function deleteMotorista(id: number): Promise<void> {
  return apiDelete(`/motorista/${id}`)
}
