"use client"

import { useEffect, useRef, useCallback, useState } from "react"
import { io, Socket } from "socket.io-client"

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL?.replace("/api", "") || "http://localhost:3001"

type StatusUpdate = {
  carregamentoId: number
  status: string
  motoristaName?: string
  nome?: string
}

type Notificacao = {
  tipo: "nova_mensagem" | "chat_solicitado"
  carregamentoId: number
  mensagem?: string
  motoristaName?: string
  nome?: string
}

type MensagemChat = {
  id: number
  carregamento_id: number
  remetente: "usuario" | "motorista"
  conteudo: string
  createdAt: string
}

type UseWebSocketOptions = {
  onStatusUpdate?: (data: StatusUpdate) => void
  onNotificacao?: (data: Notificacao) => void
  onNewMessage?: (data: MensagemChat) => void
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const socketRef = useRef<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const optionsRef = useRef(options)
  optionsRef.current = options

  useEffect(() => {
    const socket = io(SOCKET_URL, {
      transports: ["websocket", "polling"],
      autoConnect: true,
    })

    socketRef.current = socket

    socket.on("connect", () => {
      setIsConnected(true)
    })

    socket.on("disconnect", () => {
      setIsConnected(false)
    })

    socket.on("carregamento_status_update", (data: StatusUpdate) => {
      optionsRef.current.onStatusUpdate?.(data)
    })

    socket.on("notificacao", (data: Notificacao) => {
      optionsRef.current.onNotificacao?.(data)
    })

    socket.on("new_message", (data: MensagemChat) => {
      optionsRef.current.onNewMessage?.(data)
    })

    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  }, [])

  const joinCarregamento = useCallback((carregamentoId: number) => {
    socketRef.current?.emit("join_carregamento", carregamentoId)
  }, [])

  const leaveCarregamento = useCallback((carregamentoId: number) => {
    socketRef.current?.emit("leave_carregamento", carregamentoId)
  }, [])

  const sendMessage = useCallback(
    (carregamentoId: number, conteudo: string) => {
      socketRef.current?.emit("send_message", { carregamentoId, conteudo })
    },
    [],
  )

  return {
    isConnected,
    joinCarregamento,
    leaveCarregamento,
    sendMessage,
  }
}
