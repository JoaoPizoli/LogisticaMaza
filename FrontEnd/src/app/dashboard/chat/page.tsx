"use client"

import { useState, useEffect, useRef, useMemo, useCallback } from "react"
import { useSearchParams } from "next/navigation"
import { Loader2, Send, MessageSquare, Truck, ArrowLeft } from "lucide-react"
import Link from "next/link"

import { PageTemplate } from "@/components/page-template"
import { useCarregamentos } from "@/hooks/use-carregamentos"
import { useWebSocket } from "@/hooks/use-websocket"
import { getMensagens } from "@/lib/api/chat"
import type { MensagemChat, Carregamento } from "@/types"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"

export default function ChatPage() {
  const searchParams = useSearchParams()
  const preselectedId = searchParams.get("carregamento")

  const { carregamentos, isLoading } = useCarregamentos()
  const [selectedId, setSelectedId] = useState<number | null>(
    preselectedId ? Number(preselectedId) : null,
  )
  const [mensagens, setMensagens] = useState<MensagemChat[]>([])
  const [inputValue, setInputValue] = useState("")
  const [isSending, setIsSending] = useState(false)
  const [isLoadingMessages, setIsLoadingMessages] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const { joinCarregamento, leaveCarregamento, sendMessage, isConnected } =
    useWebSocket({
      onNewMessage: useCallback(
        (msg: MensagemChat) => {
          if (msg.carregamento_id === selectedId) {
            setMensagens((prev) => [...prev, msg])
          }
        },
        [selectedId],
      ),
    })

  // Carregamentos with active chat (enviado or ordenado)
  const chatCarregamentos = useMemo(
    () => carregamentos.filter((c) => c.status === "enviado" || c.status === "ordenado"),
    [carregamentos],
  )

  const selectedCarregamento = useMemo(
    () => carregamentos.find((c) => c.id === selectedId) ?? null,
    [carregamentos, selectedId],
  )

  // Load messages when selecting a carregamento
  useEffect(() => {
    if (!selectedId) return

    let cancelled = false
    setIsLoadingMessages(true)

    getMensagens(selectedId)
      .then((msgs) => {
        if (!cancelled) setMensagens(msgs)
      })
      .catch(() => {
        if (!cancelled) setMensagens([])
      })
      .finally(() => {
        if (!cancelled) setIsLoadingMessages(false)
      })

    joinCarregamento(selectedId)
    return () => {
      cancelled = true
      leaveCarregamento(selectedId)
    }
  }, [selectedId, joinCarregamento, leaveCarregamento])

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [mensagens])

  function handleSend() {
    if (!inputValue.trim() || !selectedId) return
    setIsSending(true)
    sendMessage(selectedId, inputValue.trim())
    setInputValue("")
    setIsSending(false)
  }

  if (isLoading) {
    return (
      <PageTemplate title="Chat" description="Comunicação com motoristas">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </PageTemplate>
    )
  }

  return (
    <PageTemplate
      title="Chat"
      description="Comunicação em tempo real com motoristas via Telegram"
      actions={
        <Button variant="outline" nativeButton={false} render={<Link href="/dashboard/carregamentos" />}>
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            Carregamentos
        </Button>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-[320px_1fr] gap-4 h-[calc(100vh-12rem)]">
        {/* Left panel - chat list */}
        <Card className="flex flex-col overflow-hidden">
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm">Carregamentos Ativos</CardTitle>
          </CardHeader>
          <Separator />
          <ScrollArea className="flex-1">
            {chatCarregamentos.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground px-4">
                <Truck className="h-8 w-8 mb-2" />
                <p className="text-sm text-center">
                  Nenhum carregamento com chat ativo.
                </p>
                <p className="text-xs text-center mt-1">
                  Envie um carregamento para o motorista para iniciar o chat.
                </p>
              </div>
            ) : (
              <div className="flex flex-col">
                {chatCarregamentos.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSelectedId(c.id)}
                    className={`flex items-center gap-3 p-3 text-left hover:bg-muted/50 transition-colors border-b ${
                      selectedId === c.id ? "bg-muted" : ""
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">#{c.id}</span>
                        <Badge
                          variant="default"
                          className={
                            c.status === "enviado"
                              ? "bg-blue-100 text-blue-700 hover:bg-blue-100 text-xs"
                              : "bg-orange-100 text-orange-700 hover:bg-orange-100 text-xs"
                          }
                        >
                          {c.status === "enviado" ? "Enviado" : "Ordenado"}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {c.motorista?.nome ?? "Sem motorista"}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {c.cidades_em_ordem.map((cg) => cg.cidade_nome).join(", ")}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </Card>

        {/* Right panel - chat messages */}
        <Card className="flex flex-col overflow-hidden">
          {!selectedCarregamento ? (
            <div className="flex flex-col items-center justify-center flex-1 text-muted-foreground">
              <MessageSquare className="h-10 w-10 mb-2" />
              <p className="text-sm">Selecione um carregamento para abrir o chat</p>
            </div>
          ) : (
            <>
              <CardHeader className="py-3 px-4 border-b">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-sm">
                      Carregamento #{selectedCarregamento.id} — {selectedCarregamento.motorista?.nome ?? "Motorista"}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {selectedCarregamento.cidades_em_ordem.length} cidades · {selectedCarregamento.cidades_em_ordem.reduce((s, c) => s + c.pedidos.length, 0)} pedidos
                    </p>
                  </div>
                  <Badge variant={isConnected ? "default" : "secondary"} className="text-xs">
                    {isConnected ? "Conectado" : "Desconectado"}
                  </Badge>
                </div>
              </CardHeader>

              <ScrollArea className="flex-1 p-4">
                {isLoadingMessages ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : mensagens.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                    <MessageSquare className="h-8 w-8 mb-2" />
                    <p className="text-sm">Nenhuma mensagem ainda</p>
                    <p className="text-xs">Envie uma mensagem para iniciar a conversa</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {mensagens.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex ${msg.remetente === "usuario" ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[70%] rounded-lg px-3 py-2 text-sm ${
                            msg.remetente === "usuario"
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted"
                          }`}
                        >
                          <p className="whitespace-pre-wrap break-words">{msg.conteudo}</p>
                          <p
                            className={`text-xs mt-1 ${
                              msg.remetente === "usuario"
                                ? "text-primary-foreground/70"
                                : "text-muted-foreground"
                            }`}
                          >
                            {new Date(msg.createdAt).toLocaleTimeString("pt-BR", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </ScrollArea>

              <div className="border-t p-3">
                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    handleSend()
                  }}
                  className="flex items-center gap-2"
                >
                  <Input
                    placeholder="Digite uma mensagem..."
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    disabled={isSending}
                    className="flex-1"
                  />
                  <Button
                    type="submit"
                    size="icon"
                    disabled={!inputValue.trim() || isSending}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </form>
              </div>
            </>
          )}
        </Card>
      </div>
    </PageTemplate>
  )
}
