"use client"

import { useState, useEffect, useCallback } from "react"
import type { Motorista } from "@/types"
import {
  getAllMotoristas,
  createMotorista,
  updateMotorista,
  deleteMotorista,
  type CreateMotoristaPayload,
} from "@/lib/api/motoristas"

export function useMotoristas() {
  const [motoristas, setMotoristas] = useState<Motorista[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await getAllMotoristas()
      setMotoristas(data)
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Erro ao carregar motoristas"
      setError(message)
      setMotoristas([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleCreate = useCallback(
    async (data: CreateMotoristaPayload) => {
      const result = await createMotorista(data)
      await fetchData()
      return result
    },
    [fetchData],
  )

  const handleUpdate = useCallback(
    async (id: number, data: Partial<CreateMotoristaPayload>) => {
      await updateMotorista(id, data)
      await fetchData()
    },
    [fetchData],
  )

  const handleDelete = useCallback(
    async (id: number) => {
      await deleteMotorista(id)
      await fetchData()
    },
    [fetchData],
  )

  return {
    motoristas,
    isLoading,
    error,
    refetch: fetchData,
    handleCreate,
    handleUpdate,
    handleDelete,
  }
}
