"use client"

import { useState, useEffect, useRef, useMemo, useCallback } from "react"
import {
  MapPin,
  Plus,
  Loader2,
  MoreHorizontal,
  Pencil,
  Trash2,
  ChevronUp,
  ChevronDown,
  X,
  Search,
  GripVertical,
  Upload,
  Download,
  AlertTriangle,
  Filter,
} from "lucide-react"
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from "@hello-pangea/dnd"
import { useVirtualizer } from "@tanstack/react-virtual"

import { PageTemplate } from "@/components/page-template"
import { useCidades } from "@/hooks/use-cidades"
import type { CidadeFull, ClientesOrdem } from "@/types"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

// ─── Helpers ───────────────────────────────────────────────────────────────────

function reindex(items: ClientesOrdem[]): ClientesOrdem[] {
  return items.map((item, idx) => ({ ...item, ordem: idx + 1 }))
}

function extractEstado(nome: string): string {
  const parts = nome.split(" - ")
  if (parts.length >= 2) {
    const uf = parts[parts.length - 1].trim()
    if (uf.length === 2) return uf.toUpperCase()
  }
  return ""
}

// ─── ClienteRow (used inside virtualized list) ─────────────────────────────────

function ClienteRow({
  item,
  realIndex,
  totalItems,
  onMoveToPosition,
  onRemove,
  isDragging,
}: {
  item: ClientesOrdem
  realIndex: number
  totalItems: number
  onMoveToPosition: (codcli: number, newPosition: number) => void
  onRemove: (codcli: number) => void
  isDragging?: boolean
}) {
  const [editingPos, setEditingPos] = useState(false)
  const [posValue, setPosValue] = useState("")

  function handlePosSubmit() {
    const newPos = parseInt(posValue, 10)
    if (newPos >= 1 && newPos <= totalItems && newPos !== realIndex + 1) {
      onMoveToPosition(item.codcli, newPos)
    }
    setEditingPos(false)
    setPosValue("")
  }

  return (
    <div
      className={`flex items-center gap-2 rounded-lg border p-2 text-sm bg-background ${
        isDragging ? "shadow-md ring-2 ring-primary/20" : ""
      }`}
    >
      <GripVertical className="h-4 w-4 text-muted-foreground shrink-0 cursor-grab" />

      {editingPos ? (
        <Input
          className="w-14 h-5 text-xs text-center p-0"
          type="number"
          min={1}
          max={totalItems}
          autoFocus
          value={posValue}
          onChange={(e) => setPosValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handlePosSubmit()
            if (e.key === "Escape") {
              setEditingPos(false)
              setPosValue("")
            }
          }}
          onBlur={handlePosSubmit}
        />
      ) : (
        <Badge
          variant="outline"
          className="min-w-[1.75rem] justify-center cursor-pointer"
          onClick={() => {
            setEditingPos(true)
            setPosValue(String(realIndex + 1))
          }}
          title="Clique para alterar a posição"
        >
          {realIndex + 1}
        </Badge>
      )}

      <div className="flex-1 min-w-0 flex items-center">
        <span className="font-medium shrink-0">#{item.codcli}</span>
        <span className="mx-1.5 text-muted-foreground shrink-0">·</span>
        <span className="text-muted-foreground truncate">{item.endent}</span>
      </div>

      <div className="flex items-center gap-0.5 shrink-0">
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={() => onMoveToPosition(item.codcli, realIndex)}
          disabled={realIndex === 0}
          title="Mover para cima"
        >
          <ChevronUp className="h-3 w-3" />
        </Button>
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={() => onMoveToPosition(item.codcli, realIndex + 2)}
          disabled={realIndex === totalItems - 1}
          title="Mover para baixo"
        >
          <ChevronDown className="h-3 w-3" />
        </Button>
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={() => onRemove(item.codcli)}
          className="text-destructive hover:text-destructive"
          title="Remover"
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
    </div>
  )
}

// ─── VirtualizedDraggableList ──────────────────────────────────────────────────

function VirtualizedDraggableList({
  items,
  searchQuery,
  onMoveToPosition,
  onRemove,
}: {
  items: ClientesOrdem[]
  searchQuery: string
  onMoveToPosition: (codcli: number, newPosition: number) => void
  onRemove: (codcli: number) => void
}) {
  const parentRef = useRef<HTMLDivElement>(null)

  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return items
    const q = searchQuery.toLowerCase()
    return items.filter(
      (item) =>
        String(item.codcli).includes(q) ||
        item.endent.toLowerCase().includes(q),
    )
  }, [items, searchQuery])

  const isFiltered = searchQuery.trim().length > 0

  const virtualizer = useVirtualizer({
    count: filteredItems.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 44,
    overscan: 10,
  })

  if (filteredItems.length === 0 && items.length > 0) {
    return (
      <p className="text-sm text-muted-foreground py-3 text-center">
        Nenhum cliente encontrado para &quot;{searchQuery}&quot;
      </p>
    )
  }

  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-3 text-center">
        Nenhum cliente adicionado
      </p>
    )
  }

  // When filtering, we disable drag-and-drop and use pure virtualization
  if (isFiltered) {
    return (
      <div
        ref={parentRef}
        className="overflow-auto"
        style={{ maxHeight: 400 }}
      >
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: "100%",
            position: "relative",
          }}
        >
          {virtualizer.getVirtualItems().map((virtualRow) => {
            const item = filteredItems[virtualRow.index]
            const realIndex = items.findIndex((i) => i.codcli === item.codcli)
            return (
              <div
                key={item.codcli}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                <div className="pb-1.5">
                  <ClienteRow
                    item={item}
                    realIndex={realIndex}
                    totalItems={items.length}
                    onMoveToPosition={onMoveToPosition}
                    onRemove={onRemove}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // When not filtering, use drag-and-drop with virtualization
  return (
    <div
      ref={parentRef}
      className="overflow-auto"
      style={{ maxHeight: 400 }}
    >
      <Droppable
        droppableId="ordem-entrega"
        mode="virtual"
        renderClone={(provided, snapshot, rubric) => {
          const item = items[rubric.source.index]
          return (
            <div
              ref={provided.innerRef}
              {...provided.draggableProps}
              {...provided.dragHandleProps}
            >
              <ClienteRow
                item={item}
                realIndex={rubric.source.index}
                totalItems={items.length}
                onMoveToPosition={onMoveToPosition}
                onRemove={onRemove}
                isDragging={snapshot.isDragging}
              />
            </div>
          )
        }}
      >
        {(droppableProvided) => (
          <div
            ref={(el) => {
              droppableProvided.innerRef(el)
            }}
            style={{
              height: `${virtualizer.getTotalSize()}px`,
              width: "100%",
              position: "relative",
            }}
          >
            {virtualizer.getVirtualItems().map((virtualRow) => {
              const item = items[virtualRow.index]
              return (
                <Draggable
                  key={item.codcli}
                  draggableId={String(item.codcli)}
                  index={virtualRow.index}
                >
                  {(draggableProvided, snapshot) => (
                    <div
                      ref={draggableProvided.innerRef}
                      {...draggableProvided.draggableProps}
                      {...draggableProvided.dragHandleProps}
                      style={{
                        ...draggableProvided.draggableProps.style,
                        position: snapshot.isDragging ? undefined : "absolute",
                        top: snapshot.isDragging ? undefined : 0,
                        left: snapshot.isDragging ? undefined : 0,
                        width: "100%",
                        height: snapshot.isDragging
                          ? undefined
                          : `${virtualRow.size}px`,
                        transform: snapshot.isDragging
                          ? draggableProvided.draggableProps.style?.transform
                          : `translateY(${virtualRow.start}px)`,
                      }}
                    >
                      <div className="pb-1.5">
                        <ClienteRow
                          item={item}
                          realIndex={virtualRow.index}
                          totalItems={items.length}
                          onMoveToPosition={onMoveToPosition}
                          onRemove={onRemove}
                          isDragging={snapshot.isDragging}
                        />
                      </div>
                    </div>
                  )}
                </Draggable>
              )
            })}
          </div>
        )}
      </Droppable>
    </div>
  )
}

// ─── JSON Import validation ──────────────────────────────────────────────────

function validateOrdemJson(
  data: unknown,
): { valid: true; items: ClientesOrdem[] } | { valid: false; error: string } {
  if (!Array.isArray(data)) {
    return {
      valid: false,
      error: "O JSON deve ser um array de objetos. Ex: [{ codcli, ordem, endent }]",
    }
  }

  if (data.length === 0) {
    return { valid: false, error: "O array está vazio" }
  }

  const seen = new Set<number>()
  const items: ClientesOrdem[] = []

  for (let i = 0; i < data.length; i++) {
    const row = data[i]

    if (typeof row !== "object" || row === null) {
      return { valid: false, error: `Item [${i}] não é um objeto válido` }
    }

    const codcli = Number(row.codcli)
    if (!codcli || codcli <= 0 || !Number.isFinite(codcli)) {
      return {
        valid: false,
        error: `Item [${i}]: "codcli" inválido ou ausente (valor: ${JSON.stringify(row.codcli)})`,
      }
    }

    if (seen.has(codcli)) {
      return {
        valid: false,
        error: `Item [${i}]: codcli ${codcli} duplicado no JSON`,
      }
    }
    seen.add(codcli)

    const endent =
      row.endent != null ? String(row.endent).trim() : ""

    if (!endent) {
      return {
        valid: false,
        error: `Item [${i}]: "endent" (endereço) vazio ou ausente para codcli ${codcli}`,
      }
    }

    items.push({ codcli, ordem: i + 1, endent })
  }

  return { valid: true, items: reindex(items) }
}

// ─── OrdemEntregaList ──────────────────────────────────────────────────────────

function OrdemEntregaList({
  items,
  onChange,
  cidadeNome,
}: {
  items: ClientesOrdem[]
  onChange: (items: ClientesOrdem[]) => void
  cidadeNome: string
}) {
  const [novoCodcli, setNovoCodcli] = useState("")
  const [novoEndent, setNovoEndent] = useState("")
  const [addError, setAddError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [importError, setImportError] = useState<string | null>(null)
  const [importSuccess, setImportSuccess] = useState<string | null>(null)
  const [showConfirmReplace, setShowConfirmReplace] = useState(false)
  const [pendingImport, setPendingImport] = useState<ClientesOrdem[] | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Keep items sorted by ordem
  const sorted = useMemo(
    () => [...items].sort((a, b) => a.ordem - b.ordem),
    [items],
  )

  function handleDownloadJson() {
    const data = sorted.map(({ codcli, ordem, endent }) => ({ codcli, ordem, endent }))
    const json = JSON.stringify(data, null, 2)
    const blob = new Blob([json], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `ordem-entrega-${cidadeNome.toLowerCase().replace(/\s+/g, "-")}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  function handleAdd() {
    setAddError(null)
    const codcli = parseInt(novoCodcli, 10)
    if (!codcli || codcli <= 0) {
      setAddError("Código do cliente inválido")
      return
    }
    if (!novoEndent.trim()) {
      setAddError("Endereço é obrigatório")
      return
    }
    if (sorted.some((i) => i.codcli === codcli)) {
      setAddError("Cliente já adicionado nesta cidade")
      return
    }

    const newItem: ClientesOrdem = {
      codcli,
      ordem: sorted.length + 1,
      endent: novoEndent.trim(),
    }
    onChange([...sorted, newItem])
    setNovoCodcli("")
    setNovoEndent("")
  }

  const handleRemove = useCallback(
    (codcli: number) => {
      onChange(reindex(sorted.filter((i) => i.codcli !== codcli)))
    },
    [sorted, onChange],
  )

  const handleMoveToPosition = useCallback(
    (codcli: number, newPosition: number) => {
      const currentIndex = sorted.findIndex((i) => i.codcli === codcli)
      if (currentIndex === -1) return
      const targetIndex = newPosition - 1
      if (targetIndex < 0 || targetIndex >= sorted.length) return
      if (targetIndex === currentIndex) return

      const newItems = [...sorted]
      const [moved] = newItems.splice(currentIndex, 1)
      newItems.splice(targetIndex, 0, moved)
      onChange(reindex(newItems))
    },
    [sorted, onChange],
  )

  function handleDragEnd(result: DropResult) {
    if (!result.destination) return
    const from = result.source.index
    const to = result.destination.index
    if (from === to) return

    const newItems = [...sorted]
    const [moved] = newItems.splice(from, 1)
    newItems.splice(to, 0, moved)
    onChange(reindex(newItems))
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    setImportError(null)
    setImportSuccess(null)

    const file = e.target.files?.[0]
    if (!file) return

    // Reset input so the same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = ""

    if (!file.name.endsWith(".json")) {
      setImportError("Selecione um arquivo .json")
      return
    }

    const reader = new FileReader()
    reader.onload = (evt) => {
      try {
        const parsed = JSON.parse(evt.target?.result as string)
        const result = validateOrdemJson(parsed)

        if (!result.valid) {
          setImportError(result.error)
          return
        }

        // If there are existing items, ask for confirmation before replacing
        if (sorted.length > 0) {
          setPendingImport(result.items)
          setShowConfirmReplace(true)
        } else {
          onChange(result.items)
          setImportSuccess(`${result.items.length} clientes importados com sucesso`)
          setTimeout(() => setImportSuccess(null), 4000)
        }
      } catch {
        setImportError("Arquivo JSON inválido. Verifique a formatação do arquivo.")
      }
    }
    reader.onerror = () => {
      setImportError("Erro ao ler o arquivo")
    }
    reader.readAsText(file)
  }

  function confirmReplace() {
    if (pendingImport) {
      onChange(pendingImport)
      setImportSuccess(`${pendingImport.length} clientes importados com sucesso (lista anterior substituída)`)
      setTimeout(() => setImportSuccess(null), 4000)
    }
    setPendingImport(null)
    setShowConfirmReplace(false)
  }

  function cancelReplace() {
    setPendingImport(null)
    setShowConfirmReplace(false)
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium">Ordem de Entrega</h4>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{sorted.length} clientes</Badge>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            className="hidden"
            onChange={handleFileSelect}
          />
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs gap-1.5"
            onClick={() => fileInputRef.current?.click()}
            title='Importar JSON no formato: [{ "codcli": 1, "ordem": 1, "endent": "Rua..." }]'
          >
            <Upload className="h-3.5 w-3.5" />
            Importar JSON
          </Button>
        </div>
      </div>

      <Button
        variant="outline"
        size="sm"
        className="h-7 text-xs gap-1.5 w-fit"
        onClick={handleDownloadJson}
        disabled={sorted.length === 0}
        title="Exportar ordem de entrega atual como JSON"
      >
        <Download className="h-3.5 w-3.5" />
        Exportar JSON
      </Button>

      {/* Confirm replace dialog inline */}
      {showConfirmReplace && pendingImport && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-500/50 bg-amber-50 dark:bg-amber-950/20 p-3 text-sm">
          <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-black dark:text-black">
              Substituir lista atual?
            </p>
            <p className="text-black dark:text-black mt-0.5">
              A lista atual tem <strong>{sorted.length}</strong> clientes.
              O JSON importado tem <strong>{pendingImport.length}</strong> clientes.
              A lista atual será completamente substituída.
            </p>
            <div className="flex gap-2 mt-2">
              <Button size="sm" className="h-7 text-xs" onClick={confirmReplace}>
                Substituir
              </Button>
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={cancelReplace}>
                Cancelar
              </Button>
            </div>
          </div>
        </div>
      )}

      {importError && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/50 bg-destructive/5 p-3 text-sm">
          <X className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-destructive">Erro na importação</p>
            <p className="text-destructive/80 mt-0.5 break-all">{importError}</p>
          </div>
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => setImportError(null)}
            className="shrink-0"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}

      {importSuccess && (
        <div className="flex items-center gap-2 rounded-lg border border-green-500/50 bg-green-50 dark:bg-green-950/20 p-3 text-sm text-green-700 dark:text-green-300">
          <Plus className="h-4 w-4 shrink-0" />
          <span>{importSuccess}</span>
        </div>
      )}

      {sorted.length > 0 && (
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Buscar por código ou endereço..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
        </div>
      )}

      <DragDropContext onDragEnd={handleDragEnd}>
        <VirtualizedDraggableList
          items={sorted}
          searchQuery={searchQuery}
          onMoveToPosition={handleMoveToPosition}
          onRemove={handleRemove}
        />
      </DragDropContext>

      <div className="flex gap-2">
        <div className="w-28">
          <Input
            placeholder="Código"
            type="number"
            value={novoCodcli}
            onChange={(e) => {
              setNovoCodcli(e.target.value)
              setAddError(null)
            }}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          />
        </div>
        <div className="flex-1">
          <Input
            placeholder="Endereço do cliente"
            value={novoEndent}
            onChange={(e) => {
              setNovoEndent(e.target.value)
              setAddError(null)
            }}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          />
        </div>
        <Button variant="outline" size="default" onClick={handleAdd}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      {addError && (
        <p className="text-xs text-destructive">{addError}</p>
      )}
    </div>
  )
}

// ─── CidadeSheet ───────────────────────────────────────────────────────────────

function CidadeSheet({
  open,
  onOpenChange,
  cidade,
  onSave,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  cidade: CidadeFull | null
  onSave: (data: {
    nome: string
    ordem_entrega: ClientesOrdem[]
  }) => Promise<void>
}) {
  const [nome, setNome] = useState("")
  const [ordemEntrega, setOrdemEntrega] = useState<ClientesOrdem[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      if (cidade) {
        setNome(cidade.nome)
        setOrdemEntrega([...cidade.ordem_entrega])
      } else {
        setNome("")
        setOrdemEntrega([])
      }
      setFormError(null)
    }
  }, [open, cidade])

  async function handleSubmit() {
    setFormError(null)

    if (!nome.trim()) {
      setFormError("Nome é obrigatório")
      return
    }

    const data = {
      nome: nome.trim(),
      ordem_entrega: ordemEntrega,
    }

    setIsSubmitting(true)
    try {
      await onSave(data)
      onOpenChange(false)
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : "Erro ao salvar cidade",
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>
            {cidade ? `Editar ${cidade.nome}` : "Nova Cidade"}
          </SheetTitle>
          <SheetDescription>
            {cidade
              ? "Edite os dados da cidade e a ordem de entrega dos clientes."
              : "Cadastre uma nova cidade e defina a ordem de entrega dos clientes."}
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-4 px-4 pb-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="nome">Nome da cidade *</Label>
            <Input
              id="nome"
              placeholder="Ex: São Paulo"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
            />
          </div>

          <Separator />

          <OrdemEntregaList
            items={ordemEntrega}
            onChange={setOrdemEntrega}
            cidadeNome={nome}
          />

          {formError && (
            <p className="text-sm text-destructive">{formError}</p>
          )}
        </div>

        <SheetFooter>
          <SheetClose render={<Button variant="outline" />}>
            Cancelar
          </SheetClose>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting && (
              <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
            )}
            Salvar
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

// ─── DeleteDialog ──────────────────────────────────────────────────────────────

function DeleteDialog({
  open,
  onOpenChange,
  cidadeNome,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  cidadeNome: string
  onConfirm: () => Promise<void>
}) {
  const [isDeleting, setIsDeleting] = useState(false)

  async function handleDelete() {
    setIsDeleting(true)
    try {
      await onConfirm()
      onOpenChange(false)
    } catch {
      // error handled by hook
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Excluir cidade</DialogTitle>
          <DialogDescription>
            Tem certeza que deseja excluir a cidade{" "}
            <strong>{cidadeNome}</strong>? Esta ação não pode ser desfeita.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>
            Cancelar
          </DialogClose>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting && (
              <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
            )}
            Excluir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── CidadesTable ──────────────────────────────────────────────────────────────

function CidadesTable({
  cidades,
  onEdit,
  onDelete,
}: {
  cidades: CidadeFull[]
  onEdit: (cidade: CidadeFull) => void
  onDelete: (cidade: CidadeFull) => void
}) {
  if (cidades.length === 0) {
    return null
  }

  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="p-3 font-medium text-muted-foreground">Nome</th>
                <th className="p-3 font-medium text-muted-foreground">
                  Clientes
                </th>
                <th className="p-3 font-medium text-muted-foreground w-12">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody>
              {cidades.map((cidade) => (
                <tr
                  key={cidade.id}
                  className="border-b last:border-0 hover:bg-muted/50 transition-colors"
                >
                  <td className="p-3 font-medium">{cidade.nome}</td>
                  <td className="p-3">
                    <Badge variant="secondary">
                      {cidade.ordem_entrega?.length ?? 0}
                    </Badge>
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
                        <DropdownMenuItem onClick={() => onEdit(cidade)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => onDelete(cidade)}
                          className="text-destructive focus:text-destructive"
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
        </div>
      </CardContent>
    </Card>
  )
}

// ─── EmptyState ────────────────────────────────────────────────────────────────

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
      <MapPin className="h-12 w-12 mb-3" />
      <p className="text-lg font-medium text-foreground mb-1">
        Nenhuma cidade cadastrada
      </p>
      <p className="text-sm mb-4">
        Comece adicionando uma nova cidade ao sistema.
      </p>
      <Button className="cursor-pointer" onClick={onAdd}>
        <Plus className="h-4 w-4 mr-1.5" />
        Nova Cidade
      </Button>
    </div>
  )
}

// ─── CidadesPage ───────────────────────────────────────────────────────────────

export default function CidadesPage() {
  const { cidades, isLoading, error, handleCreate, handleUpdate, handleDelete } =
    useCidades()

  const [sheetOpen, setSheetOpen] = useState(false)
  const [editingCidade, setEditingCidade] = useState<CidadeFull | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<CidadeFull | null>(null)

  const [filterNome, setFilterNome] = useState("")
  const [filterEstado, setFilterEstado] = useState("TODOS")

  const estados = useMemo(
    () =>
      [...new Set(cidades.map((c) => extractEstado(c.nome)).filter(Boolean))].sort(),
    [cidades],
  )

  const filteredCidades = useMemo(() => {
    let filtered = cidades
    if (filterNome.trim()) {
      const q = filterNome.toLowerCase()
      filtered = filtered.filter((c) => c.nome.toLowerCase().includes(q))
    }
    if (filterEstado !== "TODOS") {
      filtered = filtered.filter((c) => extractEstado(c.nome) === filterEstado)
    }
    return filtered
  }, [cidades, filterNome, filterEstado])

  const hasActiveFilters = filterNome.trim() !== "" || filterEstado !== "TODOS"

  function clearFilters() {
    setFilterNome("")
    setFilterEstado("TODOS")
  }

  function openCreate() {
    setEditingCidade(null)
    setSheetOpen(true)
  }

  function openEdit(cidade: CidadeFull) {
    setEditingCidade(cidade)
    setSheetOpen(true)
  }

  async function handleSave(data: {
    nome: string
    ordem_entrega: ClientesOrdem[]
  }) {
    if (editingCidade) {
      await handleUpdate(editingCidade.id, data)
    } else {
      await handleCreate(data)
    }
  }

  if (isLoading) {
    return (
      <PageTemplate title="Cidades" description="Gerenciamento de cidades">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </PageTemplate>
    )
  }

  return (
    <PageTemplate
      title="Cidades"
      description="Gerencie as cidades e a ordem de entrega dos clientes"
      actions={
        cidades.length > 0 ? (
          <Button className="cursor-pointer" onClick={openCreate}>
            <Plus className="h-4 w-4 mr-1.5" />
            Nova Cidade
          </Button>
        ) : undefined
      }
    >
      {error && (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-sm text-destructive">
              {error}
            </CardTitle>
          </CardHeader>
        </Card>
      )}

      {cidades.length === 0 && !error ? (
        <EmptyState onAdd={openCreate} />
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <Filter className="h-3.5 w-3.5 text-muted-foreground shrink-0" />

            <div className="flex items-center gap-1">
              <span className="text-[10px] text-muted-foreground">Nome:</span>
              <Input
                placeholder="Pesquisar cidade..."
                value={filterNome}
                onChange={(e) => setFilterNome(e.target.value)}
                className="h-8 w-[220px] text-xs"
              />
            </div>

            <div className="flex items-center gap-1">
              <span className="text-[10px] text-muted-foreground">Estado:</span>
              <Select
                value={filterEstado}
                onValueChange={(v) => setFilterEstado(v ?? "TODOS")}
              >
                <SelectTrigger className="h-8 w-[120px] text-xs">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent className="max-h-[200px]">
                  <SelectItem value="TODOS">Todos</SelectItem>
                  {estados.map((e) => (
                    <SelectItem key={e} value={e}>
                      {e}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs px-2 cursor-pointer"
                onClick={clearFilters}
              >
                <X className="h-3 w-3 mr-1" />
                Limpar
              </Button>
            )}
          </div>

          {filteredCidades.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Search className="h-12 w-12 mb-3" />
              <p className="text-lg font-medium text-foreground mb-1">
                Nenhuma cidade encontrada
              </p>
              <p className="text-sm mb-4">
                Tente ajustar os filtros de busca.
              </p>
            </div>
          ) : (
            <CidadesTable
              cidades={filteredCidades}
              onEdit={openEdit}
              onDelete={setDeleteTarget}
            />
          )}
        </>
      )}

      <CidadeSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        cidade={editingCidade}
        onSave={handleSave}
      />

      <DeleteDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
        cidadeNome={deleteTarget?.nome ?? ""}
        onConfirm={async () => {
          if (deleteTarget) {
            await handleDelete(deleteTarget.id)
            setDeleteTarget(null)
          }
        }}
      />
    </PageTemplate>
  )
}
