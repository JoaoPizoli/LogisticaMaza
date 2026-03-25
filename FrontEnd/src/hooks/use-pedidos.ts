"use client"

import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import type { Pedido, PedidoFilters, Rota, Cidade } from "@/types"
import { getPedidos, getRotas, getCidades } from "@/lib/api/pedidos"

function extractUF(cidade: string): string {
  const parts = cidade.split("-")
  if (parts.length < 2) return ""
  return parts[parts.length - 1].trim()
}

export function usePedidos(filters?: PedidoFilters) {
  const [allPedidos, setAllPedidos] = useState<Pedido[]>([])
  const [allRotas, setAllRotas] = useState<Rota[]>([])
  const [allCidades, setAllCidades] = useState<Cidade[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filtro server-side: apenas baixa_sistema (cidade é client-side para manter lista de cidades completa)
  const serverFilters = useMemo(() => {
    const sf: PedidoFilters = {}
    if (filters?.baixa_sistema !== undefined) sf.baixa_sistema = filters.baixa_sistema
    return sf
  }, [filters?.baixa_sistema])

  const initialLoadDone = useRef(false)

  const fetchData = useCallback(async () => {
    if (!initialLoadDone.current) {
      setIsLoading(true)
    }
    setError(null)
    try {
      const [pedidos, rotas, cidades] = await Promise.all([
        getPedidos(serverFilters),
        getRotas(),
        getCidades(),
      ])
      setAllPedidos(pedidos)
      setAllRotas(rotas)
      setAllCidades(cidades)
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Erro ao carregar pedidos"
      setError(message)
      setAllPedidos([])
    } finally {
      setIsLoading(false)
      initialLoadDone.current = true
    }
  }, [serverFilters])

  useEffect(() => {
    fetchData()

    const interval = setInterval(() => {
      fetchData()
    }, 10000)

    return () => clearInterval(interval)
  }, [fetchData])

  // Mapa cidade_id → nome para resolver rotas
  const cidadeIdToNome = useMemo(() => {
    const map = new Map<number, string>()
    allCidades.forEach((c) => map.set(c.id, c.nome))
    return map
  }, [allCidades])

  const pedidos = useMemo(() => {
    let filtered = allPedidos

    if (filters?.numdoc) {
      filtered = filtered.filter((p) => p.numdoc.includes(filters.numdoc!))
    }

    if (filters?.nomven && filters.nomven.length > 0) {
      const nomvenSet = new Set(filters.nomven)
      filtered = filtered.filter((p) => nomvenSet.has(p.nomven))
    }

    if (filters?.dataInicio) {
      filtered = filtered.filter((p) => p.data_emissao >= filters.dataInicio!)
    }

    if (filters?.dataFim) {
      filtered = filtered.filter((p) => p.data_emissao <= filters.dataFim!)
    }

    if (filters?.estado) {
      filtered = filtered.filter((p) => extractUF(p.cidade) === filters.estado)
    }

    if (filters?.cidade) {
      filtered = filtered.filter((p) => p.cidade === filters.cidade)
    }

    if (filters?.rota) {
      const rota = allRotas.find((r) => r.nome === filters.rota)
      if (rota) {
        const cidadesDaRota = new Set(
          rota.ordem_cidades.map((oc) => cidadeIdToNome.get(oc.cidade_id)).filter(Boolean)
        )
        filtered = filtered.filter((p) => cidadesDaRota.has(p.cidade))
      } else {
        filtered = []
      }
    }

    return filtered
  }, [allPedidos, allRotas, cidadeIdToNome, filters?.numdoc, filters?.nomven, filters?.dataInicio, filters?.dataFim, filters?.estado, filters?.cidade, filters?.rota])

  const representantes = useMemo(() => {
    const names = new Set(allPedidos.map((p) => p.nomven))
    return Array.from(names).sort()
  }, [allPedidos])

  const cidadesList = useMemo(() => {
    const names = new Set(allPedidos.map((p) => p.cidade))
    return Array.from(names).sort()
  }, [allPedidos])

  const estadosList = useMemo(() => {
    const ufs = new Set(allPedidos.map((p) => extractUF(p.cidade)).filter(Boolean))
    return Array.from(ufs).sort()
  }, [allPedidos])

  const rotasList = useMemo(() => {
    return allRotas.map((r) => r.nome).sort()
  }, [allRotas])

  return { pedidos, allPedidos, isLoading, error, refetch: fetchData, representantes, cidades: cidadesList, estados: estadosList, rotas: rotasList }
}
