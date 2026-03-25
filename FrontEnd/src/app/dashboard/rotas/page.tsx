"use client"

import { useState, useEffect, useRef, useMemo, useCallback } from "react"
import {
  Route,
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
} from "lucide-react"
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from "@hello-pangea/dnd"
import { useVirtualizer } from "@tanstack/react-virtual"

import { PageTemplate } from "@/components/page-template"
import { SearchableSelect } from "@/components/searchable-select"
import { useRotas } from "@/hooks/use-rotas"
import type { Rota, Cidade } from "@/types"

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

// ─── Types ──────────────────────────────────────────────────────────────────────

type OrdemCidade = { cidade_id: number; ordem: number }

// ─── Helpers ────────────────────────────────────────────────────────────────────

function reindex(items: OrdemCidade[]): OrdemCidade[] {
  return items.map((item, idx) => ({ ...item, ordem: idx + 1 }))
}

function extractUF(cidade: string): string {
  const parts = cidade.split("-")
  if (parts.length < 2) return ""
  return parts[parts.length - 1].trim()
}

// ─── CidadeRow (selected city in ordered list) ─────────────────────────────────

function CidadeRow({
  cidadeNome,
  realIndex,
  totalItems,
  onMoveToPosition,
  onRemove,
  isDragging,
}: {
  cidadeNome: string
  realIndex: number
  totalItems: number
  onMoveToPosition: (index: number, newPosition: number) => void
  onRemove: (index: number) => void
  isDragging?: boolean
}) {
  const [editingPos, setEditingPos] = useState(false)
  const [posValue, setPosValue] = useState("")

  function handlePosSubmit() {
    const newPos = parseInt(posValue, 10)
    if (newPos >= 1 && newPos <= totalItems && newPos !== realIndex + 1) {
      onMoveToPosition(realIndex, newPos)
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

      <div className="flex-1 min-w-0">
        <span className="truncate text-sm">{cidadeNome}</span>
      </div>

      <div className="flex items-center gap-0.5 shrink-0">
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={() => onMoveToPosition(realIndex, realIndex)}
          disabled={realIndex === 0}
          title="Mover para cima"
        >
          <ChevronUp className="h-3 w-3" />
        </Button>
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={() => onMoveToPosition(realIndex, realIndex + 2)}
          disabled={realIndex === totalItems - 1}
          title="Mover para baixo"
        >
          <ChevronDown className="h-3 w-3" />
        </Button>
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={() => onRemove(realIndex)}
          className="text-destructive hover:text-destructive"
          title="Remover"
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
    </div>
  )
}

// ─── VirtualizedSelectedList ────────────────────────────────────────────────────

function VirtualizedSelectedList({
  items,
  cidadeMap,
  searchQuery,
  onMoveToPosition,
  onRemove,
}: {
  items: OrdemCidade[]
  cidadeMap: Map<number, string>
  searchQuery: string
  onMoveToPosition: (fromIndex: number, newPosition: number) => void
  onRemove: (index: number) => void
}) {
  const parentRef = useRef<HTMLDivElement>(null)

  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return items.map((item, idx) => ({ item, idx }))
    const q = searchQuery.toLowerCase()
    return items
      .map((item, idx) => ({ item, idx }))
      .filter(({ item }) => {
        const nome = cidadeMap.get(item.cidade_id) ?? ""
        return nome.toLowerCase().includes(q)
      })
  }, [items, searchQuery, cidadeMap])

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
        Nenhuma cidade encontrada para &quot;{searchQuery}&quot;
      </p>
    )
  }

  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-3 text-center">
        Nenhuma cidade selecionada
      </p>
    )
  }

  if (isFiltered) {
    return (
      <div
        ref={parentRef}
        className="overflow-auto flex-1"
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
            const { item, idx: realIndex } = filteredItems[virtualRow.index]
            return (
              <div
                key={item.cidade_id}
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
                  <CidadeRow
                    cidadeNome={cidadeMap.get(item.cidade_id) ?? `ID ${item.cidade_id}`}
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

  return (
    <div
      ref={parentRef}
      className="overflow-auto flex-1"
      style={{ maxHeight: 400 }}
    >
      <Droppable
        droppableId="ordem-cidades"
        mode="virtual"
        renderClone={(provided, snapshot, rubric) => {
          const item = items[rubric.source.index]
          return (
            <div
              ref={provided.innerRef}
              {...provided.draggableProps}
              {...provided.dragHandleProps}
            >
              <CidadeRow
                cidadeNome={cidadeMap.get(item.cidade_id) ?? `ID ${item.cidade_id}`}
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
                  key={item.cidade_id}
                  draggableId={String(item.cidade_id)}
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
                        <CidadeRow
                          cidadeNome={cidadeMap.get(item.cidade_id) ?? `ID ${item.cidade_id}`}
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

// ─── AvailableCitiesList (left panel) ───────────────────────────────────────────

function AvailableCitiesList({
  allCidades,
  selectedCidadeIds,
  estadosList,
  representantesList,
  cidadesByRepresentante,
  cidadesEmRotas,
  onAdd,
  sheetOpen,
}: {
  allCidades: Cidade[]
  selectedCidadeIds: Set<number>
  estadosList: string[]
  representantesList: string[]
  cidadesByRepresentante: Map<string, Set<number>>
  cidadesEmRotas: Set<number>
  onAdd: (cidadeId: number) => void
  sheetOpen: boolean
}) {
  const [searchQuery, setSearchQuery] = useState("")
  const [estadoFilter, setEstadoFilter] = useState("")
  const [representanteFilter, setRepresentanteFilter] = useState("")
  const [apenasDisponiveis, setApenasDisponiveis] = useState(true)
  const parentRef = useRef<HTMLDivElement>(null)

  // Reset filters when sheet opens
  useEffect(() => {
    if (sheetOpen) {
      setSearchQuery("")
      setEstadoFilter("")
      setRepresentanteFilter("")
      setApenasDisponiveis(true)
    }
  }, [sheetOpen])

  const filteredCidades = useMemo(() => {
    let result = allCidades

    // Remove already selected
    result = result.filter((c) => !selectedCidadeIds.has(c.id))

    // Filter only cities not in any route
    if (apenasDisponiveis) {
      result = result.filter((c) => !cidadesEmRotas.has(c.id))
    }

    // Filter by estado
    if (estadoFilter) {
      result = result.filter((c) => extractUF(c.nome) === estadoFilter)
    }

    // Filter by representante
    if (representanteFilter) {
      const cidadesDoRep = cidadesByRepresentante.get(representanteFilter)
      if (cidadesDoRep) {
        result = result.filter((c) => cidadesDoRep.has(c.id))
      } else {
        result = []
      }
    }

    // Filter by text search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter((c) => c.nome.toLowerCase().includes(q))
    }

    return result
  }, [allCidades, selectedCidadeIds, estadoFilter, representanteFilter, searchQuery, cidadesByRepresentante, apenasDisponiveis, cidadesEmRotas])

  const virtualizer = useVirtualizer({
    count: filteredCidades.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 36,
    overscan: 15,
  })

  return (
    <div className="flex flex-col gap-2 flex-1 min-h-0">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium">Cidades Disponíveis</h4>
        <Badge variant="secondary">{filteredCidades.length}</Badge>
      </div>

      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          placeholder="Buscar cidade..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-8 h-8 text-sm"
        />
      </div>

      <div className="flex gap-2 flex-wrap">
        <select
          value={estadoFilter}
          onChange={(e) => setEstadoFilter(e.target.value)}
          className="h-8 rounded-md border border-input bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <option value="">Todos os estados</option>
          {estadosList.map((uf) => (
            <option key={uf} value={uf}>
              {uf}
            </option>
          ))}
        </select>

        <SearchableSelect
          options={representantesList}
          value={representanteFilter}
          onChange={setRepresentanteFilter}
          placeholder="Representante..."
          emptyText="Nenhum representante"
          width="w-[180px]"
        />
      </div>

      <label className="flex items-center gap-2 text-xs cursor-pointer select-none">
        <input
          type="checkbox"
          checked={apenasDisponiveis}
          onChange={(e) => setApenasDisponiveis(e.target.checked)}
          className="rounded border-input"
        />
        Apenas cidades sem rota
      </label>

      <div
        ref={parentRef}
        className="overflow-auto flex-1 border rounded-md"
        style={{ maxHeight: 350 }}
      >
        {filteredCidades.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            Nenhuma cidade encontrada
          </p>
        ) : (
          <div
            style={{
              height: `${virtualizer.getTotalSize()}px`,
              width: "100%",
              position: "relative",
            }}
          >
            {virtualizer.getVirtualItems().map((virtualRow) => {
              const cidade = filteredCidades[virtualRow.index]
              return (
                <div
                  key={cidade.id}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: `${virtualRow.size}px`,
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                >
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-sm hover:bg-muted/50 transition-colors text-left"
                    onClick={() => onAdd(cidade.id)}
                  >
                    <Plus className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="truncate">{cidade.nome}</span>
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── SelectedCitiesPanel (right panel) ──────────────────────────────────────────

function SelectedCitiesPanel({
  items,
  cidadeMap,
  onReorder,
}: {
  items: OrdemCidade[]
  cidadeMap: Map<number, string>
  onReorder: (items: OrdemCidade[]) => void
}) {
  const [searchQuery, setSearchQuery] = useState("")

  const handleMoveToPosition = useCallback(
    (fromIndex: number, newPosition: number) => {
      const targetIndex = newPosition - 1
      if (targetIndex < 0 || targetIndex >= items.length) return
      if (targetIndex === fromIndex) return

      const newItems = [...items]
      const [moved] = newItems.splice(fromIndex, 1)
      newItems.splice(targetIndex, 0, moved)
      onReorder(reindex(newItems))
    },
    [items, onReorder],
  )

  const handleRemove = useCallback(
    (index: number) => {
      const newItems = items.filter((_, i) => i !== index)
      onReorder(reindex(newItems))
    },
    [items, onReorder],
  )

  function handleDragEnd(result: DropResult) {
    if (!result.destination) return
    const from = result.source.index
    const to = result.destination.index
    if (from === to) return

    const newItems = [...items]
    const [moved] = newItems.splice(from, 1)
    newItems.splice(to, 0, moved)
    onReorder(reindex(newItems))
  }

  return (
    <div className="flex flex-col gap-2 flex-1 min-h-0">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium">Cidades na Rota</h4>
        <Badge variant="secondary">{items.length} cidades</Badge>
      </div>

      {items.length > 0 && (
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Buscar na rota..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
        </div>
      )}

      <DragDropContext onDragEnd={handleDragEnd}>
        <VirtualizedSelectedList
          items={items}
          cidadeMap={cidadeMap}
          searchQuery={searchQuery}
          onMoveToPosition={handleMoveToPosition}
          onRemove={handleRemove}
        />
      </DragDropContext>
    </div>
  )
}

// ─── RotaSheet ──────────────────────────────────────────────────────────────────

function RotaSheet({
  open,
  onOpenChange,
  rota,
  allCidades,
  cidadeMap,
  estadosList,
  representantesList,
  cidadesByRepresentante,
  rotas,
  onSave,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  rota: Rota | null
  allCidades: Cidade[]
  cidadeMap: Map<number, string>
  estadosList: string[]
  representantesList: string[]
  cidadesByRepresentante: Map<string, Set<number>>
  rotas: Rota[]
  onSave: (data: {
    nome: string
    ordem_cidades: OrdemCidade[]
  }) => Promise<void>
}) {
  const [nome, setNome] = useState("")
  const [selectedCidades, setSelectedCidades] = useState<OrdemCidade[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      if (rota) {
        setNome(rota.nome)
        setSelectedCidades(
          [...rota.ordem_cidades].sort((a, b) => a.ordem - b.ordem),
        )
      } else {
        setNome("")
        setSelectedCidades([])
      }
      setFormError(null)
    }
  }, [open, rota])

  const selectedCidadeIds = useMemo(
    () => new Set(selectedCidades.map((c) => c.cidade_id)),
    [selectedCidades],
  )

  // Cities already assigned to other routes (exclude current route being edited)
  const cidadesEmRotas = useMemo(() => {
    const set = new Set<number>()
    for (const r of rotas) {
      if (rota && r.id === rota.id) continue
      for (const oc of r.ordem_cidades) {
        set.add(oc.cidade_id)
      }
    }
    return set
  }, [rotas, rota])

  const handleAddCidade = useCallback(
    (cidadeId: number) => {
      if (selectedCidadeIds.has(cidadeId)) return
      setSelectedCidades((prev) =>
        reindex([...prev, { cidade_id: cidadeId, ordem: prev.length + 1 }]),
      )
    },
    [selectedCidadeIds],
  )

  async function handleSubmit() {
    setFormError(null)

    if (!nome.trim()) {
      setFormError("Nome é obrigatório")
      return
    }

    if (selectedCidades.length === 0) {
      setFormError("Selecione pelo menos uma cidade")
      return
    }

    const data = {
      nome: nome.trim(),
      ordem_cidades: selectedCidades,
    }

    setIsSubmitting(true)
    try {
      await onSave(data)
      onOpenChange(false)
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : "Erro ao salvar rota",
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="overflow-y-auto"
        style={{ maxWidth: "56rem" }}
      >
        <SheetHeader>
          <SheetTitle>
            {rota ? `Editar ${rota.nome}` : "Nova Rota"}
          </SheetTitle>
          <SheetDescription>
            {rota
              ? "Edite o nome e as cidades desta rota. Arraste para reordenar."
              : "Crie uma nova rota selecionando e ordenando as cidades."}
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-4 px-4 pb-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="rota-nome">Nome da rota *</Label>
            <Input
              id="rota-nome"
              placeholder="Ex: Rota Sul"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
            />
          </div>

          <Separator />

          <div className="flex flex-col md:flex-row gap-4" style={{ minHeight: 450 }}>
            <div className="flex-1 flex flex-col min-h-0 border rounded-lg p-3">
              <AvailableCitiesList
                allCidades={allCidades}
                selectedCidadeIds={selectedCidadeIds}
                estadosList={estadosList}
                representantesList={representantesList}
                cidadesByRepresentante={cidadesByRepresentante}
                cidadesEmRotas={cidadesEmRotas}
                onAdd={handleAddCidade}
                sheetOpen={open}
              />
            </div>

            <div className="flex-1 flex flex-col min-h-0 border rounded-lg p-3">
              <SelectedCitiesPanel
                items={selectedCidades}
                cidadeMap={cidadeMap}
                onReorder={setSelectedCidades}
              />
            </div>
          </div>

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

// ─── DeleteDialog ───────────────────────────────────────────────────────────────

function DeleteDialog({
  open,
  onOpenChange,
  rotaNome,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  rotaNome: string
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
          <DialogTitle>Excluir rota</DialogTitle>
          <DialogDescription>
            Tem certeza que deseja excluir a rota{" "}
            <strong>{rotaNome}</strong>? Esta ação não pode ser desfeita.
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

// ─── RotasTable ─────────────────────────────────────────────────────────────────

function RotasTable({
  rotas,
  cidadeMap,
  searchQuery,
  onEdit,
  onDelete,
}: {
  rotas: Rota[]
  cidadeMap: Map<number, string>
  searchQuery: string
  onEdit: (rota: Rota) => void
  onDelete: (rota: Rota) => void
}) {
  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return rotas
    const q = searchQuery.toLowerCase()
    return rotas.filter((r) => r.nome.toLowerCase().includes(q))
  }, [rotas, searchQuery])

  if (filtered.length === 0 && searchQuery.trim()) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-sm text-muted-foreground text-center">
            Nenhuma rota encontrada para &quot;{searchQuery}&quot;
          </p>
        </CardContent>
      </Card>
    )
  }

  if (filtered.length === 0) return null

  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="p-3 font-medium text-muted-foreground">Nome</th>
                <th className="p-3 font-medium text-muted-foreground">
                  Cidades
                </th>
                <th className="p-3 font-medium text-muted-foreground hidden md:table-cell">
                  Preview
                </th>
                <th className="p-3 font-medium text-muted-foreground w-12">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((rota) => {
                const cidadeNomes = rota.ordem_cidades
                  .sort((a, b) => a.ordem - b.ordem)
                  .map((oc) => cidadeMap.get(oc.cidade_id))
                  .filter(Boolean) as string[]
                const preview = cidadeNomes.slice(0, 3).join(", ")
                const remaining = cidadeNomes.length - 3

                return (
                  <tr
                    key={rota.id}
                    className="border-b last:border-0 hover:bg-muted/50 transition-colors"
                  >
                    <td className="p-3 font-medium">{rota.nome}</td>
                    <td className="p-3">
                      <Badge variant="secondary">
                        {rota.ordem_cidades.length}
                      </Badge>
                    </td>
                    <td className="p-3 hidden md:table-cell text-muted-foreground">
                      {preview}
                      {remaining > 0 && ` +${remaining}`}
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
                          <DropdownMenuItem onClick={() => onEdit(rota)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => onDelete(rota)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}

// ─── EmptyState ─────────────────────────────────────────────────────────────────

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
      <Route className="h-12 w-12 mb-3" />
      <p className="text-lg font-medium text-foreground mb-1">
        Nenhuma rota cadastrada
      </p>
      <p className="text-sm mb-4">
        Comece adicionando uma nova rota ao sistema.
      </p>
      <Button className="cursor-pointer" onClick={onAdd}>
        <Plus className="h-4 w-4 mr-1.5" />
        Nova Rota
      </Button>
    </div>
  )
}

// ─── RotasPage ──────────────────────────────────────────────────────────────────

export default function RotasPage() {
  const {
    rotas,
    allCidades,
    cidadeMap,
    estadosList,
    representantesList,
    cidadesByRepresentante,
    isLoading,
    error,
    handleCreate,
    handleUpdate,
    handleDelete,
  } = useRotas()

  const [sheetOpen, setSheetOpen] = useState(false)
  const [editingRota, setEditingRota] = useState<Rota | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Rota | null>(null)
  const [tableSearch, setTableSearch] = useState("")

  function openCreate() {
    setEditingRota(null)
    setSheetOpen(true)
  }

  function openEdit(rota: Rota) {
    setEditingRota(rota)
    setSheetOpen(true)
  }

  async function handleSave(data: {
    nome: string
    ordem_cidades: OrdemCidade[]
  }) {
    if (editingRota) {
      await handleUpdate(editingRota.id, data)
    } else {
      await handleCreate(data)
    }
  }

  if (isLoading) {
    return (
      <PageTemplate title="Rotas" description="Gerenciamento de rotas">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </PageTemplate>
    )
  }

  return (
    <PageTemplate
      title="Rotas"
      description="Gerencie as rotas e a ordem das cidades em cada rota"
      actions={
        rotas.length > 0 ? (
          <Button className="cursor-pointer" onClick={openCreate}>
            <Plus className="h-4 w-4 mr-1.5" />
            Nova Rota
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

      {rotas.length === 0 && !error ? (
        <EmptyState onAdd={openCreate} />
      ) : (
        <>
          {rotas.length > 5 && (
            <div className="relative max-w-sm">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Buscar rota..."
                value={tableSearch}
                onChange={(e) => setTableSearch(e.target.value)}
                className="pl-8 h-8 text-sm"
              />
            </div>
          )}
          <RotasTable
            rotas={rotas}
            cidadeMap={cidadeMap}
            searchQuery={tableSearch}
            onEdit={openEdit}
            onDelete={setDeleteTarget}
          />
        </>
      )}

      <RotaSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        rota={editingRota}
        allCidades={allCidades}
        cidadeMap={cidadeMap}
        estadosList={estadosList}
        representantesList={representantesList}
        cidadesByRepresentante={cidadesByRepresentante}
        rotas={rotas}
        onSave={handleSave}
      />

      <DeleteDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
        rotaNome={deleteTarget?.nome ?? ""}
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
