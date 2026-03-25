"use client"

import { type ReactNode, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { AppSidebar } from "@/components/app-sidebar"
import { DashboardHeader } from "@/components/dashboard-header"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { getStoredToken } from "@/lib/api"
import { Toaster, toast } from "sonner"
import { useWebSocket } from "@/hooks/use-websocket"

function WebSocketNotifications() {
  useWebSocket({
    onStatusUpdate: (data) => {
      const statusLabels: Record<string, string> = {
        enviado: "Enviado ao motorista",
        ordenado: "Ordenação confirmada",
        finalizado: "Finalizado",
      }
      const label = data.nome ?? `Carregamento #${data.carregamentoId}`
      toast.info(
        `${label}: ${statusLabels[data.status] ?? data.status}`,
        { description: data.motoristaName ? `Motorista: ${data.motoristaName}` : undefined },
      )
    },
    onNotificacao: (data) => {
      const label = data.nome ?? `Carregamento #${data.carregamentoId}`
      if (data.tipo === "nova_mensagem") {
        toast.message(`Nova mensagem — ${label}`, {
          description: data.mensagem,
          action: {
            label: "Abrir Chat",
            onClick: () => {
              window.open(`/dashboard/chat?carregamento=${data.carregamentoId}`, "_blank")
            },
          },
        })
      } else if (data.tipo === "chat_solicitado") {
        toast.info(`Motorista solicitou chat — ${label}`, {
          description: data.motoristaName ? `Motorista: ${data.motoristaName}` : undefined,
        })
      }
    },
  })

  return null
}

export default function DashboardLayout({
  children,
}: {
  children: ReactNode
}) {
  const router = useRouter()
  const [authorized, setAuthorized] = useState(false)

  useEffect(() => {
    if (!getStoredToken()) {
      router.replace("/login")
    } else {
      setAuthorized(true)
    }
  }, [router])

  if (!authorized) {
    return null
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <DashboardHeader />
        <main className="flex flex-1 flex-col overflow-auto">
          {children}
        </main>
      </SidebarInset>
      <WebSocketNotifications />
      <Toaster position="top-right" richColors />
    </SidebarProvider>
  )
}
