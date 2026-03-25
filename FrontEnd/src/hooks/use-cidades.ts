"use client"

import { useState, useEffect, useCallback } from "react"
import type { CidadeFull, ClientesOrdem } from "@/types"
import { getAllCidades, createCidade, updateCidade, deleteCidade } from "@/lib/api/cidades"

export function useCidades() {
  const [cidades, setCidades] = useState<CidadeFull[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchCidades = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await getAllCidades()
      setCidades(data)
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Erro ao carregar cidades"
      setError(message)
      setCidades([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCidades()
  }, [fetchCidades])

  const handleCreate = useCallback(
    async (data: {
      nome: string
      ordem_entrega?: ClientesOrdem[]
    }) => {
      await createCidade(data)
      await fetchCidades()
    },
    [fetchCidades],
  )

  const handleUpdate = useCallback(
    async (
      id: number,
      data: Partial<{
        nome: string
        ordem_entrega: ClientesOrdem[]
      }>,
    ) => {
      await updateCidade(id, data)
      await fetchCidades()
    },
    [fetchCidades],
  )

  const handleDelete = useCallback(
    async (id: number) => {
      await deleteCidade(id)
      await fetchCidades()
    },
    [fetchCidades],
  )

  return {
    cidades,
    isLoading,
    error,
    refetch: fetchCidades,
    handleCreate,
    handleUpdate,
    handleDelete,
  }
}
