"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import type { Carregamento, CidadeGrupo, Rota, Cidade } from "@/types"
import {
  getAllCarregamentos,
  createCarregamento,
  updateCarregamento,
  finalizarCarregamento,
  deleteCarregamento,
  montarCarregamento,
  enviarParaMotorista,
  reenviarParaMotorista,
  type CreateCarregamentoPayload,
} from "@/lib/api/carregamentos"
import { getAllRotas } from "@/lib/api/rotas"
import { getCidades } from "@/lib/api/pedidos"

export function useCarregamentos() {
  const [carregamentos, setCarregamentos] = useState<Carregamento[]>([])
  const [allRotas, setAllRotas] = useState<Rota[]>([])
  const [allCidades, setAllCidades] = useState<Cidade[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const [carregamentosData, rotasData, cidadesData] = await Promise.all([
        getAllCarregamentos(),
        getAllRotas(),
        getCidades(),
      ])
      setCarregamentos(carregamentosData)
      setAllRotas(rotasData)
      setAllCidades(cidadesData)
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Erro ao carregar carregamentos"
      setError(message)
      setCarregamentos([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleCreate = useCallback(
    async (data: CreateCarregamentoPayload) => {
      const result = await createCarregamento(data)
      await fetchData()
      return result
    },
    [fetchData],
  )

  const handleUpdate = useCallback(
    async (id: number, data: Partial<CreateCarregamentoPayload>) => {
      await updateCarregamento(id, data)
      await fetchData()
    },
    [fetchData],
  )

  const handleDelete = useCallback(
    async (id: number) => {
      await deleteCarregamento(id)
      await fetchData()
    },
    [fetchData],
  )

  const handleFinalizar = useCallback(
    async (id: number) => {
      await finalizarCarregamento(id)
      await fetchData()
    },
    [fetchData],
  )

  const handleEnviarParaMotorista = useCallback(
    async (id: number) => {
      await enviarParaMotorista(id)
      await fetchData()
    },
    [fetchData],
  )

  const handleReenviarParaMotorista = useCallback(
    async (id: number) => {
      await reenviarParaMotorista(id)
      await fetchData()
    },
    [fetchData],
  )

  const handleMontar = useCallback(
    async (params: { rotaId?: number; cidades?: number[] }) => {
      return montarCarregamento(params)
    },
    [],
  )

  const cidadeMap = useMemo(() => {
    const map = new Map<number, string>()
    allCidades.forEach((c) => map.set(c.id, c.nome))
    return map
  }, [allCidades])

  return {
    carregamentos,
    allRotas,
    allCidades,
    cidadeMap,
    isLoading,
    error,
    refetch: fetchData,
    handleCreate,
    handleUpdate,
    handleDelete,
    handleFinalizar,
    handleEnviarParaMotorista,
    handleReenviarParaMotorista,
    handleMontar,
  }
}
