"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import type { Rota, Cidade, Pedido } from "@/types"
import { getAllRotas, createRota, updateRota, deleteRota, type CreateRotaPayload } from "@/lib/api/rotas"
import { getCidades, getPedidos } from "@/lib/api/pedidos"

function extractUF(cidade: string): string {
  const parts = cidade.split("-")
  if (parts.length < 2) return ""
  return parts[parts.length - 1].trim()
}

export function useRotas() {
  const [rotas, setRotas] = useState<Rota[]>([])
  const [allCidades, setAllCidades] = useState<Cidade[]>([])
  const [allPedidos, setAllPedidos] = useState<Pedido[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const [rotasData, cidadesData, pedidosData] = await Promise.all([
        getAllRotas(),
        getCidades(),
        getPedidos(),
      ])
      setRotas(rotasData)
      setAllCidades(cidadesData)
      setAllPedidos(pedidosData)
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Erro ao carregar rotas"
      setError(message)
      setRotas([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleCreate = useCallback(
    async (data: CreateRotaPayload) => {
      await createRota(data)
      await fetchData()
    },
    [fetchData],
  )

  const handleUpdate = useCallback(
    async (id: number, data: Partial<CreateRotaPayload>) => {
      await updateRota(id, data)
      await fetchData()
    },
    [fetchData],
  )

  const handleDelete = useCallback(
    async (id: number) => {
      await deleteRota(id)
      await fetchData()
    },
    [fetchData],
  )

  // cidade.id → cidade.nome
  const cidadeMap = useMemo(() => {
    const map = new Map<number, string>()
    allCidades.forEach((c) => map.set(c.id, c.nome))
    return map
  }, [allCidades])

  // cidade.nome → cidade.id (para mapear pedidos)
  const cidadeNameToId = useMemo(() => {
    const map = new Map<string, number>()
    allCidades.forEach((c) => map.set(c.nome.trim(), c.id))
    return map
  }, [allCidades])

  // Lista de UFs únicas
  const estadosList = useMemo(() => {
    const ufs = new Set<string>()
    allCidades.forEach((c) => {
      const uf = extractUF(c.nome)
      if (uf) ufs.add(uf)
    })
    return Array.from(ufs).sort()
  }, [allCidades])

  // Lista de representantes únicos
  const representantesList = useMemo(() => {
    const names = new Set(allPedidos.map((p) => p.nomven))
    return Array.from(names).sort()
  }, [allPedidos])

  // representante → Set<cidade_id>
  const cidadesByRepresentante = useMemo(() => {
    const map = new Map<string, Set<number>>()
    for (const pedido of allPedidos) {
      const cidadeId = cidadeNameToId.get(pedido.cidade.trim())
      if (cidadeId === undefined) continue
      if (!map.has(pedido.nomven)) map.set(pedido.nomven, new Set())
      map.get(pedido.nomven)!.add(cidadeId)
    }
    return map
  }, [allPedidos, cidadeNameToId])

  return {
    rotas,
    allCidades,
    cidadeMap,
    estadosList,
    representantesList,
    cidadesByRepresentante,
    isLoading,
    error,
    refetch: fetchData,
    handleCreate,
    handleUpdate,
    handleDelete,
  }
}
