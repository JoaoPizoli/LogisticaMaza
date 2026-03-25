import { apiGet } from "@/lib/api"
import type { MensagemChat } from "@/types"

export async function getMensagens(
  carregamentoId: number,
): Promise<MensagemChat[]> {
  return apiGet<MensagemChat[]>(`/chat/${carregamentoId}/mensagens`)
}
