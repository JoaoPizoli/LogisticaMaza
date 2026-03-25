"use client"

import { useState, useCallback, useMemo } from "react"
import {
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  Copy,
  Check,
  Loader2,
  Phone,
  User,
  Search,
} from "lucide-react"
import { PageTemplate } from "@/components/page-template"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetClose,
} from "@/components/ui/sheet"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useMotoristas } from "@/hooks/use-motoristas"
import type { Motorista } from "@/types"

export default function MotoristasPage() {
  const {
    motoristas,
    isLoading,
    error,
    handleCreate,
    handleUpdate,
    handleDelete,
  } = useMotoristas()

  const [searchTerm, setSearchTerm] = useState("")
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editingMotorista, setEditingMotorista] = useState<Motorista | null>(
    null,
  )
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [motoristaDeletar, setMotoristaDeletar] = useState<Motorista | null>(
    null,
  )
  const [codigoDialogOpen, setCodigoDialogOpen] = useState(false)
  const [codigoMotorista, setCodigoMotorista] = useState<Motorista | null>(null)
  const [copiedCode, setCopiedCode] = useState(false)

  // Form state
  const [nome, setNome] = useState("")
  const [telefone, setTelefone] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const filteredMotoristas = useMemo(() => {
    if (!searchTerm.trim()) return motoristas
    const term = searchTerm.toLowerCase()
    return motoristas.filter(
      (m) =>
        m.nome.toLowerCase().includes(term) ||
        m.telefone?.toLowerCase().includes(term) ||
        m.codigo_vinculacao.toLowerCase().includes(term),
    )
  }, [motoristas, searchTerm])

  const openCreate = useCallback(() => {
    setEditingMotorista(null)
    setNome("")
    setTelefone("")
    setFormError(null)
    setSheetOpen(true)
  }, [])

  const openEdit = useCallback((m: Motorista) => {
    setEditingMotorista(m)
    setNome(m.nome)
    setTelefone(m.telefone || "")
    setFormError(null)
    setSheetOpen(true)
  }, [])

  const handleSubmit = useCallback(async () => {
    if (!nome.trim()) {
      setFormError("Nome é obrigatório")
      return
    }
    setIsSubmitting(true)
    setFormError(null)
    try {
      if (editingMotorista) {
        await handleUpdate(editingMotorista.id, {
          nome: nome.trim(),
          telefone: telefone.trim() || undefined,
        })
      } else {
        const created = await handleCreate({
          nome: nome.trim(),
          telefone: telefone.trim() || undefined,
        })
        setCodigoMotorista(created)
        setCodigoDialogOpen(true)
      }
      setSheetOpen(false)
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : "Erro ao salvar motorista",
      )
    } finally {
      setIsSubmitting(false)
    }
  }, [nome, telefone, editingMotorista, handleCreate, handleUpdate])

  const confirmDelete = useCallback(async () => {
    if (!motoristaDeletar) return
    try {
      await handleDelete(motoristaDeletar.id)
    } catch {
      // error handled by hook
    }
    setDeleteDialogOpen(false)
    setMotoristaDeletar(null)
  }, [motoristaDeletar, handleDelete])

  const copyCode = useCallback((code: string) => {
    navigator.clipboard.writeText(code)
    setCopiedCode(true)
    setTimeout(() => setCopiedCode(false), 2000)
  }, [])

  if (isLoading) {
    return (
      <PageTemplate
        title="Motoristas"
        description="Gerencie os motoristas e vinculação com Telegram"
      >
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </PageTemplate>
    )
  }

  return (
    <PageTemplate
      title="Motoristas"
      description="Gerencie os motoristas e vinculação com Telegram"
    >
      <div className="px-6 pb-6 flex flex-col gap-4">
        {error && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar motorista..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-1.5" />
            Novo Motorista
          </Button>
        </div>

        {filteredMotoristas.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <User className="h-12 w-12 mb-3 opacity-50" />
              <p className="font-medium">Nenhum motorista encontrado</p>
              <p className="text-sm">
                Cadastre motoristas para alocar aos carregamentos.
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="p-3 font-medium text-muted-foreground">
                      Nome
                    </th>
                    <th className="p-3 font-medium text-muted-foreground hidden sm:table-cell">
                      Telefone
                    </th>
                    <th className="p-3 font-medium text-muted-foreground">
                      Telegram
                    </th>
                    <th className="p-3 font-medium text-muted-foreground hidden md:table-cell">
                      Código
                    </th>
                    <th className="p-3 font-medium text-muted-foreground w-10">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMotoristas.map((m) => (
                    <tr
                      key={m.id}
                      className="border-b last:border-0 hover:bg-muted/50 transition-colors"
                    >
                      <td className="p-3 font-medium">{m.nome}</td>
                      <td className="p-3 text-muted-foreground hidden sm:table-cell">
                        {m.telefone || "—"}
                      </td>
                      <td className="p-3">
                        {m.telegram_chat_id ? (
                          <Badge
                            variant="outline"
                            className="bg-green-500/10 text-green-700 border-green-500/30"
                          >
                            Vinculado
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="bg-amber-500/10 text-amber-700 border-amber-500/30"
                          >
                            Pendente
                          </Badge>
                        )}
                      </td>
                      <td className="p-3 hidden md:table-cell">
                        <button
                          onClick={() => copyCode(m.codigo_vinculacao)}
                          className="flex items-center gap-1.5 font-mono text-xs bg-muted px-2 py-1 rounded hover:bg-muted/80 transition-colors"
                          title="Clique para copiar"
                        >
                          {m.codigo_vinculacao}
                          <Copy className="h-3 w-3 text-muted-foreground" />
                        </button>
                      </td>
                      <td className="p-3">
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            render={
                              <Button variant="ghost" size="icon-xs" />
                            }
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEdit(m)}>
                              <Pencil className="mr-2 h-4 w-4" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setCodigoMotorista(m)
                                setCodigoDialogOpen(true)
                              }}
                            >
                              <Copy className="mr-2 h-4 w-4" />
                              Ver Código
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => {
                                setMotoristaDeletar(m)
                                setDeleteDialogOpen(true)
                              }}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Create/Edit Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>
              {editingMotorista ? "Editar Motorista" : "Novo Motorista"}
            </SheetTitle>
            <SheetDescription>
              {editingMotorista
                ? "Atualize os dados do motorista."
                : "Cadastre um novo motorista. Após criar, um código de vinculação será gerado para conectar ao Telegram."}
            </SheetDescription>
          </SheetHeader>
          <div className="px-4 pb-4 flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="nome">Nome *</Label>
              <Input
                id="nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Nome completo do motorista"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="telefone">Telefone</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="telefone"
                  value={telefone}
                  onChange={(e) => setTelefone(e.target.value)}
                  placeholder="(11) 99999-0000"
                  className="pl-9"
                />
              </div>
            </div>
            {formError && (
              <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-3 text-sm text-destructive">
                {formError}
              </div>
            )}
          </div>
          <SheetFooter>
            <SheetClose render={<Button variant="outline" />}>
              Cancelar
            </SheetClose>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting && (
                <Loader2 className="animate-spin mr-1.5 h-4 w-4" />
              )}
              {editingMotorista ? "Salvar" : "Criar Motorista"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir Motorista</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir o motorista &quot;
              {motoristaDeletar?.nome}&quot;? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Código de Vinculação Dialog */}
      <Dialog open={codigoDialogOpen} onOpenChange={setCodigoDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Código de Vinculação do Telegram</DialogTitle>
            <DialogDescription>
              Envie este código para o motorista{" "}
              <strong>{codigoMotorista?.nome}</strong>. Ele deve enviar o
              seguinte comando ao bot no Telegram:
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="bg-muted rounded-lg px-6 py-4 text-center">
              <p className="text-xs text-muted-foreground mb-1">
                Comando para o Telegram:
              </p>
              <code className="text-lg font-mono font-bold">
                /start {codigoMotorista?.codigo_vinculacao}
              </code>
            </div>
            <Button
              variant="outline"
              onClick={() =>
                copyCode(
                  `/start ${codigoMotorista?.codigo_vinculacao || ""}`,
                )
              }
              className="gap-2"
            >
              {copiedCode ? (
                <>
                  <Check className="h-4 w-4 text-green-600" />
                  Copiado!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Copiar Comando
                </>
              )}
            </Button>
            {codigoMotorista?.telegram_chat_id ? (
              <Badge className="bg-green-500/10 text-green-700 border-green-500/30">
                ✓ Já vinculado ao Telegram
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="bg-amber-500/10 text-amber-700 border-amber-500/30"
              >
                Aguardando vinculação...
              </Badge>
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => setCodigoDialogOpen(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageTemplate>
  )
}
