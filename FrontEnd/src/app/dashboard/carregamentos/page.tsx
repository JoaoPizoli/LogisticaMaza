"use client"

import { useState, useEffect, useRef, useMemo, useCallback } from "react"
import {
  Truck,
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
  CheckCircle,
  Save,
  ChevronRight,
  PackagePlus,
  Weight,
  Download,
  Send,
  MessageSquare,
  Eye,
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
import { useCarregamentos } from "@/hooks/use-carregamentos"
import { useMotoristas } from "@/hooks/use-motoristas"
import { generateRomaneioPdf } from "@/lib/generate-romaneio-pdf"
import type { Carregamento, CidadeGrupo, PedidoOrdemItem, Rota, Cidade, Motorista } from "@/types"

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

// ─── Helpers ────────────────────────────────────────────────────────────────────

function reindexCidades(items: CidadeGrupo[]): CidadeGrupo[] {
  return items.map((item, idx) => ({ ...item, ordem: idx + 1 }))
}

function reindexPedidos(pedidos: PedidoOrdemItem[]): PedidoOrdemItem[] {
  return pedidos.map((p, idx) => ({ ...p, ordem: idx + 1 }))
}

function calcPesoTotal(cidades: CidadeGrupo[]): number {
  return cidades.reduce(
    (total, c) => total + c.pedidos.reduce((sum, p) => sum + p.peso_bruto, 0),
    0,
  )
}

function calcPesoCidade(cidade: CidadeGrupo): number {
  return cidade.pedidos.reduce((sum, p) => sum + p.peso_bruto, 0)
}

// ─── WeightIndicator ────────────────────────────────────────────────────────────

function WeightIndicator({
  pesoTotal,
  capacidadeMaxima,
}: {
  pesoTotal: number
  capacidadeMaxima: number
}) {
  const percentual = capacidadeMaxima > 0 ? (pesoTotal / capacidadeMaxima) * 100 : 0
  const overweight = percentual > 100

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30">
      <Weight className="h-5 w-5 text-muted-foreground shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between text-sm mb-1">
          <span className="font-medium">
            {pesoTotal.toFixed(2)} kg
            {capacidadeMaxima > 0 && (
              <span className="text-muted-foreground"> / {capacidadeMaxima.toFixed(0)} kg</span>
            )}
          </span>
          {capacidadeMaxima > 0 && (
            <span className={`text-xs font-medium ${overweight ? "text-destructive" : "text-muted-foreground"}`}>
              {percentual.toFixed(1)}%
            </span>
          )}
        </div>
        {capacidadeMaxima > 0 && (
          <div className="w-full bg-muted rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${
                overweight ? "bg-destructive" : percentual > 80 ? "bg-yellow-500" : "bg-primary"
              }`}
              style={{ width: `${Math.min(percentual, 100)}%` }}
            />
          </div>
        )}
      </div>
    </div>
  )
}

// ─── PedidoRow ──────────────────────────────────────────────────────────────────

function PedidoRow({
  pedido,
  realIndex,
  totalItems,
  onMoveToPosition,
  onRemove,
  isDragging,
  readOnly,
}: {
  pedido: PedidoOrdemItem
  realIndex: number
  totalItems: number
  onMoveToPosition: (index: number, newPosition: number) => void
  onRemove: (index: number) => void
  isDragging?: boolean
  readOnly?: boolean
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

  const hasItens = pedido.itens && pedido.itens.length > 0
  const [showItens, setShowItens] = useState(false)

  return (
    <div
      className={`rounded-lg border bg-background ${
        isDragging ? "shadow-md ring-2 ring-primary/20" : ""
      }`}
    >
      <div className="flex items-center gap-2 p-2 text-sm">
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
            className={`min-w-[1.75rem] justify-center ${readOnly ? "" : "cursor-pointer"}`}
            onClick={() => {
              if (readOnly) return
              setEditingPos(true)
              setPosValue(String(realIndex + 1))
            }}
            title={readOnly ? undefined : "Clique para alterar a posição"}
          >
            {realIndex + 1}
          </Badge>
        )}

        <div className="flex-1 min-w-0 flex items-center gap-2">
          {hasItens && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                setShowItens(!showItens)
              }}
              className="p-0.5 rounded hover:bg-muted cursor-pointer shrink-0"
              title="Ver itens do pedido"
            >
              <ChevronRight
                className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${
                  showItens ? "rotate-90" : ""
                }`}
              />
            </button>
          )}
          <Badge variant="secondary" className="shrink-0 text-xs">
            {pedido.numdoc}
          </Badge>
          <span className="truncate text-sm">{pedido.nomcli}</span>
        </div>

        <span className="text-xs text-muted-foreground shrink-0 tabular-nums">
          {pedido.peso_bruto.toFixed(2)} kg
        </span>

        {!readOnly && (
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
        )}
      </div>

      {hasItens && showItens && (
        <div className="px-4 pb-2 pt-0 border-t bg-muted/30 rounded-b-lg">
          <div className="pl-6 py-1.5 space-y-0.5">
            {pedido.itens!.map((item, idx) => (
              <div key={idx} className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">
                  {item.qtdite}x
                </span>
                <span>{item.descri}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── CidadeCard ─────────────────────────────────────────────────────────────────

function CidadeCard({
  cidadeGrupo,
  cidadeIndex,
  totalCidades,
  onMoveCidade,
  onRemoveCidade,
  onUpdatePedidos,
  isDragging,
  readOnly,
}: {
  cidadeGrupo: CidadeGrupo
  cidadeIndex: number
  totalCidades: number
  onMoveCidade: (fromIndex: number, newPosition: number) => void
  onRemoveCidade: (index: number) => void
  onUpdatePedidos: (cidadeIndex: number, pedidos: PedidoOrdemItem[]) => void
  isDragging?: boolean
  readOnly?: boolean
}) {
  const [expanded, setExpanded] = useState(true)
  const pesoCidade = calcPesoCidade(cidadeGrupo)

  const handleMovePedido = useCallback(
    (fromIndex: number, newPosition: number) => {
      const targetIndex = newPosition - 1
      const pedidos = [...cidadeGrupo.pedidos]
      if (targetIndex < 0 || targetIndex >= pedidos.length) return
      if (targetIndex === fromIndex) return
      const [moved] = pedidos.splice(fromIndex, 1)
      pedidos.splice(targetIndex, 0, moved)
      onUpdatePedidos(cidadeIndex, reindexPedidos(pedidos))
    },
    [cidadeGrupo.pedidos, cidadeIndex, onUpdatePedidos],
  )

  const handleRemovePedido = useCallback(
    (index: number) => {
      const pedidos = cidadeGrupo.pedidos.filter((_, i) => i !== index)
      onUpdatePedidos(cidadeIndex, reindexPedidos(pedidos))
    },
    [cidadeGrupo.pedidos, cidadeIndex, onUpdatePedidos],
  )

  return (
    <div
      className={`rounded-lg border bg-card ${
        isDragging ? "shadow-md ring-2 ring-primary/20" : ""
      }`}
    >
      {/* Header da cidade */}
      <div className="flex items-center gap-2 p-3 border-b">
        <GripVertical className="h-4 w-4 text-muted-foreground shrink-0 cursor-grab" />

        <Badge variant="outline" className="min-w-[1.75rem] justify-center">
          {cidadeIndex + 1}
        </Badge>

        <button
          type="button"
          className="flex items-center gap-1 flex-1 min-w-0 text-left"
          onClick={() => setExpanded(!expanded)}
        >
          <ChevronRight
            className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform ${
              expanded ? "rotate-90" : ""
            }`}
          />
          <span className="font-medium text-sm truncate">
            {cidadeGrupo.cidade_nome}
          </span>
        </button>

        <Badge variant="secondary" className="shrink-0">
          {cidadeGrupo.pedidos.length} pedidos
        </Badge>
        <span className="text-xs text-muted-foreground shrink-0 tabular-nums">
          {pesoCidade.toFixed(2)} kg
        </span>

        {!readOnly && (
        <div className="flex items-center gap-0.5 shrink-0">
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => onMoveCidade(cidadeIndex, cidadeIndex)}
            disabled={cidadeIndex === 0}
            title="Mover cidade para cima"
          >
            <ChevronUp className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => onMoveCidade(cidadeIndex, cidadeIndex + 2)}
            disabled={cidadeIndex === totalCidades - 1}
            title="Mover cidade para baixo"
          >
            <ChevronDown className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => onRemoveCidade(cidadeIndex)}
            className="text-destructive hover:text-destructive"
            title="Remover cidade"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
        )}
      </div>

      {/* Pedidos da cidade */}
      {expanded && (
        <Droppable droppableId={`cidade-${cidadeGrupo.cidade_id}`} type="PEDIDO">
          {(provided) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className="p-2 space-y-1.5 min-h-[40px]"
            >
              {cidadeGrupo.pedidos.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-2">
                  Nenhum pedido nesta cidade
                </p>
              ) : (
                cidadeGrupo.pedidos.map((pedido, pedidoIdx) => (
                  <Draggable
                    key={pedido.numdoc}
                    draggableId={`pedido-${pedido.numdoc}`}
                    index={pedidoIdx}
                    isDragDisabled={readOnly}
                  >
                    {(draggableProvided, snapshot) => (
                      <div
                        ref={draggableProvided.innerRef}
                        {...draggableProvided.draggableProps}
                        {...draggableProvided.dragHandleProps}
                      >
                        <PedidoRow
                          pedido={pedido}
                          realIndex={pedidoIdx}
                          totalItems={cidadeGrupo.pedidos.length}
                          onMoveToPosition={handleMovePedido}
                          onRemove={handleRemovePedido}
                          isDragging={snapshot.isDragging}
                          readOnly={readOnly}
                        />
                      </div>
                    )}
                  </Draggable>
                ))
              )}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      )}
    </div>
  )
}

// ─── AddPedidoInput ─────────────────────────────────────────────────────────────

function AddPedidoInput({
  onAdd,
  isLoading: isAdding,
}: {
  onAdd: (numdoc: string) => Promise<void>
  isLoading: boolean
}) {
  const [numdoc, setNumdoc] = useState("")
  const [error, setError] = useState<string | null>(null)

  async function handleAdd() {
    if (!numdoc.trim()) return
    setError(null)
    try {
      await onAdd(numdoc.trim())
      setNumdoc("")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao adicionar pedido")
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <PackagePlus className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Digitar numdoc para adicionar..."
            value={numdoc}
            onChange={(e) => {
              setNumdoc(e.target.value)
              setError(null)
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAdd()
            }}
            className="pl-8 h-8 text-sm"
          />
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={handleAdd}
          disabled={!numdoc.trim() || isAdding}
        >
          {isAdding ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Plus className="h-3.5 w-3.5" />
          )}
          Adicionar
        </Button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}

// ─── SelectionMode ──────────────────────────────────────────────────────────────

function SelectionPanel({
  mode,
  setMode,
  allRotas,
  allCidades,
  selectedRotaId,
  onSelectRota,
  selectedCidadeIds,
  onAddCidade,
  onRemoveCidade,
  cidadeMap,
  isLoadingMontar,
}: {
  mode: "rota" | "cidades"
  setMode: (mode: "rota" | "cidades") => void
  allRotas: Rota[]
  allCidades: Cidade[]
  selectedRotaId: number | null
  onSelectRota: (rotaId: number) => void
  selectedCidadeIds: number[]
  onAddCidade: (cidadeId: number) => void
  onRemoveCidade: (cidadeId: number) => void
  cidadeMap: Map<number, string>
  isLoadingMontar: boolean
}) {
  const rotaOptions = useMemo(
    () => allRotas.map((r) => `${r.id} - ${r.nome}`),
    [allRotas],
  )

  const cidadeOptions = useMemo(() => {
    const selectedSet = new Set(selectedCidadeIds)
    return allCidades
      .filter((c) => !selectedSet.has(c.id))
      .map((c) => `${c.id} - ${c.nome}`)
  }, [allCidades, selectedCidadeIds])

  return (
    <div className="flex flex-col gap-3">
      <Label>Modo de Seleção</Label>
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant={mode === "rota" ? "default" : "outline"}
          className="cursor-pointer"
          onClick={() => setMode("rota")}
          disabled={isLoadingMontar}
        >
          Selecionar Rota
        </Button>
        <Button
          size="sm"
          variant={mode === "cidades" ? "default" : "outline"}
          className="cursor-pointer"
          onClick={() => setMode("cidades")}
          disabled={isLoadingMontar}
        >
          Selecionar Cidades
        </Button>
        {isLoadingMontar && (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {mode === "rota" ? (
        <div className="flex flex-col gap-2">
          <Label>Rota</Label>
          <SearchableSelect
            options={rotaOptions}
            value={selectedRotaId ? `${selectedRotaId} - ${allRotas.find((r) => r.id === selectedRotaId)?.nome ?? ""}` : ""}
            onChange={(val) => {
              const id = parseInt(val.split(" - ")[0], 10)
              if (!isNaN(id)) onSelectRota(id)
            }}
            placeholder="Selecionar rota..."
            emptyText="Nenhuma rota disponível"
            width="w-full"
          />
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <Label>Adicionar cidade</Label>
          <SearchableSelect
            options={cidadeOptions}
            value=""
            onChange={(val) => {
              const id = parseInt(val.split(" - ")[0], 10)
              if (!isNaN(id)) onAddCidade(id)
            }}
            placeholder="Buscar e adicionar cidade..."
            emptyText="Nenhuma cidade disponível"
            width="w-full"
          />
          {selectedCidadeIds.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-1">
              {selectedCidadeIds.map((id) => (
                <Badge key={id} variant="secondary" className="gap-1">
                  {cidadeMap.get(id) ?? `ID ${id}`}
                  <button
                    type="button"
                    onClick={() => onRemoveCidade(id)}
                    className="ml-0.5 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── CarregamentoSheet ──────────────────────────────────────────────────────────

function CarregamentoSheet({
  open,
  onOpenChange,
  carregamento,
  allRotas,
  allCidades,
  cidadeMap,
  allMotoristas,
  onSave,
  onFinalizar,
  onEnviarParaMotorista,
  onReenviarParaMotorista,
  onMontar,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  carregamento: Carregamento | null
  allRotas: Rota[]
  allCidades: Cidade[]
  cidadeMap: Map<number, string>
  allMotoristas: Motorista[]
  onSave: (data: {
    cidades_em_ordem: CidadeGrupo[]
    capacidade_maxima: number
    peso_total: number
    rota_id?: number
    nome?: string
    motorista_id?: number
    status: string
  }) => Promise<number | void>
  onFinalizar: (id: number) => Promise<void>
  onEnviarParaMotorista: (id: number) => Promise<void>
  onReenviarParaMotorista: (id: number) => Promise<void>
  onMontar: (params: { rotaId?: number; cidades?: number[] }) => Promise<CidadeGrupo[]>
}) {
  const [selectionMode, setSelectionMode] = useState<"rota" | "cidades">("rota")
  const [selectedRotaId, setSelectedRotaId] = useState<number | null>(null)
  const [selectedCidadeIds, setSelectedCidadeIds] = useState<number[]>([])
  const [cidadesEmOrdem, setCidadesEmOrdem] = useState<CidadeGrupo[]>([])
  const [capacidadeMaxima, setCapacidadeMaxima] = useState("19000")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoadingMontar, setIsLoadingMontar] = useState(false)
  const [isAddingPedido, setIsAddingPedido] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [finalizarDialogOpen, setFinalizarDialogOpen] = useState(false)
  const [enviarDialogOpen, setEnviarDialogOpen] = useState(false)
  const [reenviarDialogOpen, setReenviarDialogOpen] = useState(false)
  const [selectedMotoristaId, setSelectedMotoristaId] = useState<number | null>(null)

  const pesoTotal = useMemo(() => calcPesoTotal(cidadesEmOrdem), [cidadesEmOrdem])
  const isFinalizado = carregamento?.status === "finalizado"
  const isEnviado = carregamento?.status === "enviado"
  const isOrdenado = carregamento?.status === "ordenado"
  const isReadOnly = isFinalizado

  useEffect(() => {
    if (open) {
      if (carregamento) {
        setCidadesEmOrdem(carregamento.cidades_em_ordem || [])
        setCapacidadeMaxima(String(carregamento.capacidade_maxima))
        setSelectedRotaId(carregamento.rota_id)
        setSelectedMotoristaId(carregamento.motorista_id)
        if (carregamento.rota_id) {
          setSelectionMode("rota")
        } else {
          setSelectionMode("cidades")
          setSelectedCidadeIds(
            (carregamento.cidades_em_ordem || []).map((c) => c.cidade_id),
          )
        }
      } else {
        setCidadesEmOrdem([])
        setCapacidadeMaxima("19000")
        setSelectedRotaId(null)
        setSelectedCidadeIds([])
        setSelectionMode("rota")
        setSelectedMotoristaId(null)
      }
      setFormError(null)
    }
  }, [open, carregamento])

  // Montar ao selecionar rota
  const handleSelectRota = useCallback(
    async (rotaId: number) => {
      setSelectedRotaId(rotaId)
      setIsLoadingMontar(true)
      try {
        const result = await onMontar({ rotaId })
        setCidadesEmOrdem(result)
      } catch (err) {
        setFormError(err instanceof Error ? err.message : "Erro ao montar carregamento")
      } finally {
        setIsLoadingMontar(false)
      }
    },
    [onMontar],
  )

  // Adicionar cidade avulsa
  const handleAddCidade = useCallback(
    async (cidadeId: number) => {
      const newIds = [...selectedCidadeIds, cidadeId]
      setSelectedCidadeIds(newIds)
      setIsLoadingMontar(true)
      try {
        const result = await onMontar({ cidades: newIds })
        setCidadesEmOrdem(result)
      } catch (err) {
        setFormError(err instanceof Error ? err.message : "Erro ao montar carregamento")
      } finally {
        setIsLoadingMontar(false)
      }
    },
    [selectedCidadeIds, onMontar],
  )

  // Remover cidade avulsa
  const handleRemoveCidade = useCallback(
    async (cidadeId: number) => {
      const newIds = selectedCidadeIds.filter((id) => id !== cidadeId)
      setSelectedCidadeIds(newIds)
      // Remover do romaneio localmente
      setCidadesEmOrdem((prev) =>
        reindexCidades(prev.filter((c) => c.cidade_id !== cidadeId)),
      )
    },
    [selectedCidadeIds],
  )

  // Drag and drop
  function handleDragEnd(result: DropResult) {
    if (!result.destination) return

    const { source, destination, type } = result

    if (type === "CIDADE") {
      if (source.index === destination.index) return
      const newCidades = [...cidadesEmOrdem]
      const [moved] = newCidades.splice(source.index, 1)
      newCidades.splice(destination.index, 0, moved)
      setCidadesEmOrdem(reindexCidades(newCidades))
      return
    }

    if (type === "PEDIDO") {
      const sourceCidadeId = source.droppableId.replace("cidade-", "")
      const destCidadeId = destination.droppableId.replace("cidade-", "")

      const newCidades = cidadesEmOrdem.map((c) => ({
        ...c,
        pedidos: [...c.pedidos],
      }))

      const sourceGrupo = newCidades.find(
        (c) => String(c.cidade_id) === sourceCidadeId,
      )
      const destGrupo = newCidades.find(
        (c) => String(c.cidade_id) === destCidadeId,
      )

      if (!sourceGrupo || !destGrupo) return

      if (sourceCidadeId === destCidadeId) {
        // Reordenar dentro da mesma cidade
        const [moved] = sourceGrupo.pedidos.splice(source.index, 1)
        sourceGrupo.pedidos.splice(destination.index, 0, moved)
        sourceGrupo.pedidos = reindexPedidos(sourceGrupo.pedidos)
      } else {
        // Mover entre cidades
        const [moved] = sourceGrupo.pedidos.splice(source.index, 1)
        destGrupo.pedidos.splice(destination.index, 0, moved)
        sourceGrupo.pedidos = reindexPedidos(sourceGrupo.pedidos)
        destGrupo.pedidos = reindexPedidos(destGrupo.pedidos)
      }

      setCidadesEmOrdem(newCidades)
    }
  }

  // Mover cidade
  const handleMoveCidade = useCallback(
    (fromIndex: number, newPosition: number) => {
      const targetIndex = newPosition - 1
      if (targetIndex < 0 || targetIndex >= cidadesEmOrdem.length) return
      if (targetIndex === fromIndex) return
      const newCidades = [...cidadesEmOrdem]
      const [moved] = newCidades.splice(fromIndex, 1)
      newCidades.splice(targetIndex, 0, moved)
      setCidadesEmOrdem(reindexCidades(newCidades))
    },
    [cidadesEmOrdem],
  )

  // Remover cidade do romaneio
  const handleRemoveCidadeFromRomaneio = useCallback(
    (index: number) => {
      const removed = cidadesEmOrdem[index]
      const newCidades = cidadesEmOrdem.filter((_, i) => i !== index)
      setCidadesEmOrdem(reindexCidades(newCidades))
      if (selectionMode === "cidades") {
        setSelectedCidadeIds((prev) =>
          prev.filter((id) => id !== removed.cidade_id),
        )
      }
    },
    [cidadesEmOrdem, selectionMode],
  )

  // Atualizar pedidos de uma cidade
  const handleUpdatePedidos = useCallback(
    (cidadeIndex: number, pedidos: PedidoOrdemItem[]) => {
      setCidadesEmOrdem((prev) =>
        prev.map((c, i) => (i === cidadeIndex ? { ...c, pedidos } : c)),
      )
    },
    [],
  )

  // Adicionar pedido por numdoc (via input local, busca no backend ao salvar)
  const handleAddPedido = useCallback(
    async (numdoc: string) => {
      setIsAddingPedido(true)
      try {
        // Buscar pedido na API para obter dados
        const { apiGet } = await import("@/lib/api")
        const pedidos = await apiGet<Array<{ numdoc: string; nomcli: string; peso_bruto: number; cidade: string }>>(
          `/pedido?numdoc=${encodeURIComponent(numdoc)}&baixa_sistema=false`,
        )

        // A API retorna array, filtrar pelo numdoc exato
        const pedido = Array.isArray(pedidos)
          ? pedidos.find((p) => p.numdoc === numdoc)
          : null

        if (!pedido) {
          throw new Error(`Pedido ${numdoc} não encontrado ou já possui baixa`)
        }

        // Verificar se já está no carregamento
        for (const c of cidadesEmOrdem) {
          if (c.pedidos.some((p) => p.numdoc === numdoc)) {
            throw new Error(`Pedido ${numdoc} já está neste carregamento`)
          }
        }

        // Encontrar cidade correspondente
        const cidadeNome = pedido.cidade
        let cidadeGrupoIdx = cidadesEmOrdem.findIndex((c) =>
          cidadeNome.toUpperCase().includes(c.cidade_nome.split(" - ")[0].trim().toUpperCase()),
        )

        const newCidades = cidadesEmOrdem.map((c) => ({
          ...c,
          pedidos: [...c.pedidos],
        }))

        if (cidadeGrupoIdx === -1) {
          // Criar novo grupo de cidade
          const cidadeEntity = allCidades.find((c) =>
            cidadeNome.toUpperCase().includes(c.nome.split(" - ")[0].trim().toUpperCase()),
          )
          newCidades.push({
            cidade_id: cidadeEntity?.id || 0,
            cidade_nome: cidadeNome,
            ordem: newCidades.length + 1,
            pedidos: [],
          })
          cidadeGrupoIdx = newCidades.length - 1
        }

        newCidades[cidadeGrupoIdx].pedidos.push({
          numdoc: pedido.numdoc,
          ordem: newCidades[cidadeGrupoIdx].pedidos.length + 1,
          nomcli: pedido.nomcli,
          peso_bruto: pedido.peso_bruto,
        })

        setCidadesEmOrdem(newCidades)
      } finally {
        setIsAddingPedido(false)
      }
    },
    [cidadesEmOrdem, allCidades],
  )

  // Salvar rascunho
  async function handleSave() {
    setFormError(null)
    const cap = parseFloat(capacidadeMaxima)
    if (isNaN(cap) || cap <= 0) {
      setFormError("Capacidade máxima inválida")
      return
    }

    setIsSubmitting(true)
    try {
      const rotaNome = selectionMode === "rota" && selectedRotaId
        ? allRotas.find((r) => r.id === selectedRotaId)?.nome
        : undefined
      await onSave({
        cidades_em_ordem: cidadesEmOrdem,
        capacidade_maxima: cap,
        peso_total: pesoTotal,
        rota_id: selectedRotaId || undefined,
        nome: rotaNome,
        motorista_id: selectedMotoristaId || undefined,
        status: carregamento?.status ?? "rascunho",
      })
      onOpenChange(false)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Erro ao salvar carregamento")
    } finally {
      setIsSubmitting(false)
    }
  }

  // Enviar para motorista
  async function handleEnviarConfirm() {
    setIsSubmitting(true)
    try {
      // Primeiro salvar o estado atual com motorista
      const rotaNome = selectionMode === "rota" && selectedRotaId
        ? allRotas.find((r) => r.id === selectedRotaId)?.nome
        : undefined
      const newId = await onSave({
        cidades_em_ordem: cidadesEmOrdem,
        capacidade_maxima: parseFloat(capacidadeMaxima),
        peso_total: pesoTotal,
        rota_id: selectedRotaId || undefined,
        nome: rotaNome,
        motorista_id: selectedMotoristaId || undefined,
        status: "rascunho",
      })
      // Depois enviar
      const id = carregamento?.id ?? newId
      if (!id) throw new Error("Carregamento não encontrado")
      await onEnviarParaMotorista(id)
      setEnviarDialogOpen(false)
      onOpenChange(false)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Erro ao enviar para motorista")
    } finally {
      setIsSubmitting(false)
    }
  }

  // Reenviar para motorista (após edição com status 'enviado' ou 'ordenado')
  async function handleReenviarConfirm() {
    if (!carregamento) return
    setIsSubmitting(true)
    try {
      // Primeiro salvar as alterações
      const rotaNome = selectionMode === "rota" && selectedRotaId
        ? allRotas.find((r) => r.id === selectedRotaId)?.nome
        : undefined
      await onSave({
        cidades_em_ordem: cidadesEmOrdem,
        capacidade_maxima: parseFloat(capacidadeMaxima),
        peso_total: pesoTotal,
        rota_id: selectedRotaId || undefined,
        nome: rotaNome,
        motorista_id: selectedMotoristaId || undefined,
        status: carregamento.status,
      })
      // Depois reenviar
      await onReenviarParaMotorista(carregamento.id)
      setReenviarDialogOpen(false)
      onOpenChange(false)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Erro ao reenviar para motorista")
    } finally {
      setIsSubmitting(false)
    }
  }

  // Finalizar
  async function handleFinalizarConfirm() {
    if (!carregamento) return
    setIsSubmitting(true)
    try {
      await onFinalizar(carregamento.id)

      // Buscar dados atualizados do carregamento (pode ter sido reordenado pelo motorista)
      const { getCarregamento } = await import("@/lib/api/carregamentos")
      const updated = await getCarregamento(carregamento.id)

      // Gerar e baixar PDF do romaneio com dados atualizados
      generateRomaneioPdf({
        id: updated.id,
        cidadesEmOrdem: updated.cidades_em_ordem,
        capacidadeMaxima: updated.capacidade_maxima,
        pesoTotal: updated.peso_total,
        nome: updated.nome,
      })

      setFinalizarDialogOpen(false)
      onOpenChange(false)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Erro ao finalizar carregamento")
    } finally {
      setIsSubmitting(false)
    }
  }

  const totalPedidos = cidadesEmOrdem.reduce((sum, c) => sum + c.pedidos.length, 0)

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          className="overflow-y-auto"
          style={{ maxWidth: "64rem" }}
        >
          <SheetHeader>
            <SheetTitle>
              {carregamento
                ? isFinalizado
                  ? `${carregamento.nome ?? `Carregamento #${carregamento.id}`} (Finalizado)`
                  : `Editar ${carregamento.nome ?? `Carregamento #${carregamento.id}`}${isEnviado ? " (Enviado)" : isOrdenado ? " (Ordenado)" : ""}`
                : "Novo Carregamento"}
            </SheetTitle>
            <SheetDescription>
              {isFinalizado
                ? "Visualização do carregamento finalizado."
                : isEnviado
                  ? "Edite a ordem e reenvie para o motorista."
                  : isOrdenado
                    ? "O motorista confirmou a ordenação. Edite se necessário e reenvie, ou finalize."
                    : carregamento
                      ? "Edite a ordem de entrega e os pedidos deste carregamento."
                      : "Selecione uma rota ou cidades para montar o romaneio de entrega."}
            </SheetDescription>
          </SheetHeader>

          <div className="flex flex-col gap-4 px-4 pb-4">
            {/* Capacidade */}
            <div className="flex flex-col gap-2">
              <Label htmlFor="capacidade">Capacidade Máxima (kg)</Label>
              <Input
                id="capacidade"
                type="number"
                value={capacidadeMaxima}
                onChange={(e) => setCapacidadeMaxima(e.target.value)}
                disabled={isReadOnly}
                className="max-w-[200px]"
              />
            </div>

            {/* Motorista */}
            {!isFinalizado && (
              <div className="flex flex-col gap-2">
                <Label>Motorista <span className="text-destructive">*</span></Label>
                {isReadOnly ? (
                  <div className="text-sm">
                    {carregamento?.motorista
                      ? `${carregamento.motorista.nome}${carregamento.motorista.telefone ? ` — ${carregamento.motorista.telefone}` : ""}`
                      : "Nenhum motorista atribuído"}
                  </div>
                ) : (
                  <SearchableSelect
                    options={allMotoristas
                      .filter((m) => m.ativo)
                      .map((m) => `${m.id}::${m.nome}${m.telegram_chat_id ? "" : " (Telegram não vinculado)"}`)}
                    value={selectedMotoristaId ? `${selectedMotoristaId}::${allMotoristas.find((m) => m.id === selectedMotoristaId)?.nome ?? ""}` : ""}
                    onChange={(val) => {
                      const id = parseInt(val.split("::")[0], 10)
                      setSelectedMotoristaId(isNaN(id) ? null : id)
                    }}
                    placeholder="Selecione um motorista..."
                    displayLabel={(raw) => raw.split("::").slice(1).join("::")}
                  />
                )}
              </div>
            )}

            {/* Seleção rota/cidades */}
            {!isReadOnly && (
              <>
                <Separator />
                <SelectionPanel
                  mode={selectionMode}
                  setMode={setSelectionMode}
                  allRotas={allRotas}
                  allCidades={allCidades}
                  selectedRotaId={selectedRotaId}
                  onSelectRota={handleSelectRota}
                  selectedCidadeIds={selectedCidadeIds}
                  onAddCidade={handleAddCidade}
                  onRemoveCidade={handleRemoveCidade}
                  cidadeMap={cidadeMap}
                  isLoadingMontar={isLoadingMontar}
                />
              </>
            )}

            <Separator />

            {/* Indicador de peso */}
            <WeightIndicator
              pesoTotal={pesoTotal}
              capacidadeMaxima={parseFloat(capacidadeMaxima) || 0}
            />

            {/* Info resumo */}
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <span>{cidadesEmOrdem.length} cidades</span>
              <span>{totalPedidos} pedidos</span>
            </div>

            {/* Adicionar pedido por numdoc */}
            {!isReadOnly && cidadesEmOrdem.length > 0 && (
              <AddPedidoInput onAdd={handleAddPedido} isLoading={isAddingPedido} />
            )}

            {/* Romaneio - Editor de ordem */}
            {cidadesEmOrdem.length > 0 ? (
              <DragDropContext onDragEnd={handleDragEnd}>
                <Droppable droppableId="cidades-list" type="CIDADE">
                  {(provided) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className="space-y-3"
                    >
                      {cidadesEmOrdem.map((cidadeGrupo, idx) => (
                        <Draggable
                          key={cidadeGrupo.cidade_id}
                          draggableId={`cidade-drag-${cidadeGrupo.cidade_id}`}
                          index={idx}
                          isDragDisabled={isReadOnly}
                        >
                          {(draggableProvided, snapshot) => (
                            <div
                              ref={draggableProvided.innerRef}
                              {...draggableProvided.draggableProps}
                              {...draggableProvided.dragHandleProps}
                            >
                              <CidadeCard
                                cidadeGrupo={cidadeGrupo}
                                cidadeIndex={idx}
                                totalCidades={cidadesEmOrdem.length}
                                onMoveCidade={handleMoveCidade}
                                onRemoveCidade={handleRemoveCidadeFromRomaneio}
                                onUpdatePedidos={handleUpdatePedidos}
                                isDragging={snapshot.isDragging}
                                readOnly={isReadOnly}
                              />
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <Truck className="h-10 w-10 mb-2" />
                <p className="text-sm">
                  Selecione uma rota ou cidades para visualizar os pedidos
                </p>
              </div>
            )}

            {formError && (
              <p className="text-sm text-destructive">{formError}</p>
            )}
          </div>

          <SheetFooter>
            <SheetClose render={<Button variant="outline" className="cursor-pointer" />}>
              {isFinalizado ? "Fechar" : "Cancelar"}
            </SheetClose>
            {!isFinalizado && !isEnviado && !isOrdenado && (
              <>
                <Button
                  variant="outline"
                  className="cursor-pointer"
                  onClick={handleSave}
                  disabled={isSubmitting || cidadesEmOrdem.length === 0}
                >
                  {isSubmitting && (
                    <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                  )}
                  <Save className="h-4 w-4 mr-1.5" />
                  Salvar Rascunho
                </Button>
                <Button
                  className="cursor-pointer"
                  onClick={() => setEnviarDialogOpen(true)}
                  disabled={isSubmitting || cidadesEmOrdem.length === 0 || totalPedidos === 0 || !selectedMotoristaId}
                >
                  <Send className="h-4 w-4 mr-1.5" />
                  Enviar para Motorista
                </Button>
              </>
            )}
            {(isEnviado || isOrdenado) && carregamento && (
              <>
                <Button
                  variant="outline"
                  className="cursor-pointer"
                  onClick={handleSave}
                  disabled={isSubmitting || cidadesEmOrdem.length === 0}
                >
                  {isSubmitting && (
                    <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                  )}
                  <Save className="h-4 w-4 mr-1.5" />
                  Salvar Alterações
                </Button>
                <Button
                  className="cursor-pointer"
                  onClick={() => setReenviarDialogOpen(true)}
                  disabled={isSubmitting || cidadesEmOrdem.length === 0 || totalPedidos === 0 || !selectedMotoristaId}
                >
                  <Send className="h-4 w-4 mr-1.5" />
                  Reenviar para Motorista
                </Button>
              </>
            )}
            {isOrdenado && carregamento && (
              <Button
                onClick={() => setFinalizarDialogOpen(true)}
                disabled={isSubmitting}
              >
                <CheckCircle className="h-4 w-4 mr-1.5" />
                Finalizar
              </Button>
            )}
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Dialog de confirmação de envio para motorista */}
      <Dialog open={enviarDialogOpen} onOpenChange={setEnviarDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enviar para Motorista</DialogTitle>
            <DialogDescription>
              O romaneio será enviado ao motorista via Telegram para confirmação da ordem de entrega.
            </DialogDescription>
          </DialogHeader>
          <div className="text-sm space-y-1">
            <p><strong>Motorista:</strong> {allMotoristas.find((m) => m.id === selectedMotoristaId)?.nome ?? "—"}</p>
            <p><strong>Cidades:</strong> {cidadesEmOrdem.length}</p>
            <p><strong>Pedidos:</strong> {totalPedidos}</p>
            <p><strong>Peso Total:</strong> {pesoTotal.toFixed(2)} kg</p>
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              Cancelar
            </DialogClose>
            <Button onClick={handleEnviarConfirm} disabled={isSubmitting}>
              {isSubmitting && (
                <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
              )}
              <Send className="h-4 w-4 mr-1.5" />
              Confirmar Envio
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmação de reenvio para motorista */}
      <Dialog open={reenviarDialogOpen} onOpenChange={setReenviarDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reenviar Ordem ao Motorista</DialogTitle>
            <DialogDescription>
              A ordem atualizada será reenviada ao motorista via Telegram. A ordem anterior será invalidada automaticamente.
            </DialogDescription>
          </DialogHeader>
          <div className="text-sm space-y-1">
            <p><strong>Motorista:</strong> {allMotoristas.find((m) => m.id === selectedMotoristaId)?.nome ?? "—"}</p>
            <p><strong>Cidades:</strong> {cidadesEmOrdem.length}</p>
            <p><strong>Pedidos:</strong> {totalPedidos}</p>
            <p><strong>Peso Total:</strong> {pesoTotal.toFixed(2)} kg</p>
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              Cancelar
            </DialogClose>
            <Button onClick={handleReenviarConfirm} disabled={isSubmitting}>
              {isSubmitting && (
                <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
              )}
              <Send className="h-4 w-4 mr-1.5" />
              Confirmar Reenvio
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmação de finalização */}
      <Dialog open={finalizarDialogOpen} onOpenChange={setFinalizarDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Finalizar Carregamento</DialogTitle>
            <DialogDescription>
              Ao finalizar, todos os <strong>{totalPedidos} pedidos</strong> receberão baixa
              automática no sistema. Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <div className="text-sm space-y-1">
            <p><strong>Cidades:</strong> {cidadesEmOrdem.length}</p>
            <p><strong>Pedidos:</strong> {totalPedidos}</p>
            <p><strong>Peso Total:</strong> {pesoTotal.toFixed(2)} kg</p>
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              Cancelar
            </DialogClose>
            <Button onClick={handleFinalizarConfirm} disabled={isSubmitting}>
              {isSubmitting && (
                <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
              )}
              <CheckCircle className="h-4 w-4 mr-1.5" />
              Confirmar Finalização
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

// ─── DeleteDialog ───────────────────────────────────────────────────────────────

function DeleteDialog({
  open,
  onOpenChange,
  carregamentoId,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  carregamentoId: number
  onConfirm: () => Promise<void>
}) {
  const [isDeleting, setIsDeleting] = useState(false)

  async function handleDelete() {
    setIsDeleting(true)
    try {
      await onConfirm()
      onOpenChange(false)
    } catch {
      // handled by hook
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Excluir carregamento</DialogTitle>
          <DialogDescription>
            Tem certeza que deseja excluir o carregamento{" "}
            <strong>#{carregamentoId}</strong>? Esta ação não pode ser desfeita.
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

// ─── CarregamentosTable ─────────────────────────────────────────────────────────

function CarregamentosTable({
  carregamentos,
  searchQuery,
  onEdit,
  onFinalizar,
  onEnviarParaMotorista,
  onDelete,
  onOpenChat,
}: {
  carregamentos: Carregamento[]
  searchQuery: string
  onEdit: (c: Carregamento) => void
  onFinalizar: (c: Carregamento) => void
  onEnviarParaMotorista: (c: Carregamento) => void
  onDelete: (c: Carregamento) => void
  onOpenChat: (c: Carregamento) => void
}) {
  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return carregamentos
    const q = searchQuery.toLowerCase()
    return carregamentos.filter((c) => {
      const cidadeNomes = c.cidades_em_ordem.map((cg) => cg.cidade_nome.toLowerCase()).join(" ")
      return (
        String(c.id).includes(q) ||
        (c.nome && c.nome.toLowerCase().includes(q)) ||
        c.status.toLowerCase().includes(q) ||
        cidadeNomes.includes(q)
      )
    })
  }, [carregamentos, searchQuery])

  if (filtered.length === 0 && searchQuery.trim()) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-sm text-muted-foreground text-center">
            Nenhum carregamento encontrado para &quot;{searchQuery}&quot;
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
                <th className="p-3 font-medium text-muted-foreground">#</th>
                <th className="p-3 font-medium text-muted-foreground">Status</th>
                <th className="p-3 font-medium text-muted-foreground hidden md:table-cell">Motorista</th>
                <th className="p-3 font-medium text-muted-foreground">Cidades</th>
                <th className="p-3 font-medium text-muted-foreground hidden md:table-cell">
                  Pedidos
                </th>
                <th className="p-3 font-medium text-muted-foreground">Peso</th>
                <th className="p-3 font-medium text-muted-foreground hidden md:table-cell">
                  Data
                </th>
                <th className="p-3 font-medium text-muted-foreground w-12">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => {
                const totalPedidos = c.cidades_em_ordem.reduce(
                  (sum, cg) => sum + cg.pedidos.length,
                  0,
                )
                const isFinalizado = c.status === "finalizado"
                const isEnviado = c.status === "enviado"
                const isOrdenado = c.status === "ordenado"

                const statusConfig: Record<string, { label: string; className: string }> = {
                  rascunho: { label: "Rascunho", className: "" },
                  enviado: { label: "Enviado", className: "bg-blue-100 text-blue-700 hover:bg-blue-100" },
                  ordenado: { label: "Ordenado", className: "bg-orange-100 text-orange-700 hover:bg-orange-100" },
                  finalizado: { label: "Finalizado", className: "bg-green-100 text-green-700 hover:bg-green-100" },
                }
                const sc = statusConfig[c.status] || statusConfig.rascunho

                return (
                  <tr
                    key={c.id}
                    className="border-b last:border-0 hover:bg-muted/50 transition-colors"
                  >
                    <td className="p-3 font-medium">{c.nome ?? `#${c.id}`}</td>
                    <td className="p-3">
                      <Badge
                        variant={c.status === "rascunho" ? "secondary" : "default"}
                        className={sc.className}
                      >
                        {sc.label}
                      </Badge>
                    </td>
                    <td className="p-3 hidden md:table-cell text-sm">
                      {c.motorista?.nome ?? "—"}
                    </td>
                    <td className="p-3">
                      <Badge variant="secondary">
                        {c.cidades_em_ordem.length}
                      </Badge>
                    </td>
                    <td className="p-3 hidden md:table-cell">
                      <Badge variant="outline">{totalPedidos}</Badge>
                    </td>
                    <td className="p-3 tabular-nums">
                      {c.peso_total.toFixed(2)} kg
                    </td>
                    <td className="p-3 hidden md:table-cell text-muted-foreground">
                      {new Date(c.createdAt).toLocaleDateString("pt-BR")}
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
                          <DropdownMenuItem onClick={() => onEdit(c)}>
                            {c.status === "finalizado" ? (
                              <><Eye className="mr-2 h-4 w-4" />Visualizar</>
                            ) : (
                              <><Pencil className="mr-2 h-4 w-4" />Editar</>
                            )}
                          </DropdownMenuItem>
                          {isFinalizado && (
                            <DropdownMenuItem
                              onClick={() =>
                                generateRomaneioPdf({
                                  id: c.id,
                                  cidadesEmOrdem: c.cidades_em_ordem,
                                  capacidadeMaxima: c.capacidade_maxima,
                                  pesoTotal: c.peso_total,
                                  nome: c.nome,
                                })
                              }
                            >
                              <Download className="mr-2 h-4 w-4" />
                              Download Romaneio
                            </DropdownMenuItem>
                          )}
                          {c.status === "rascunho" && (
                            <>
                              <DropdownMenuItem onClick={() => onEnviarParaMotorista(c)}>
                                <Send className="mr-2 h-4 w-4" />
                                Enviar para Motorista
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => onDelete(c)}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Excluir
                              </DropdownMenuItem>
                            </>
                          )}
                          {(isEnviado || isOrdenado) && (
                            <DropdownMenuItem onClick={() => onOpenChat(c)}>
                              <MessageSquare className="mr-2 h-4 w-4" />
                              Chat com Motorista
                            </DropdownMenuItem>
                          )}
                          {isOrdenado && (
                            <DropdownMenuItem onClick={() => onFinalizar(c)}>
                              <CheckCircle className="mr-2 h-4 w-4" />
                              Finalizar
                            </DropdownMenuItem>
                          )}
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
      <Truck className="h-12 w-12 mb-3" />
      <p className="text-lg font-medium text-foreground mb-1">
        Nenhum carregamento cadastrado
      </p>
      <p className="text-sm mb-4">
        Comece criando um novo carregamento para montar o romaneio de entrega.
      </p>
      <Button className="cursor-pointer" onClick={onAdd}>
        <Plus className="h-4 w-4 mr-1.5" />
        Novo Carregamento
      </Button>
    </div>
  )
}

// ─── CarregamentosPage ──────────────────────────────────────────────────────────

export default function CarregamentosPage() {
  const {
    carregamentos,
    allRotas,
    allCidades,
    cidadeMap,
    isLoading,
    error,
    handleCreate,
    handleUpdate,
    handleDelete,
    handleFinalizar,
    handleEnviarParaMotorista,
    handleReenviarParaMotorista,
    handleMontar,
  } = useCarregamentos()

  const { motoristas } = useMotoristas()

  const [sheetOpen, setSheetOpen] = useState(false)
  const [editingCarregamento, setEditingCarregamento] = useState<Carregamento | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Carregamento | null>(null)
  const [tableSearch, setTableSearch] = useState("")

  function openCreate() {
    setEditingCarregamento(null)
    setSheetOpen(true)
  }

  function openEdit(c: Carregamento) {
    setEditingCarregamento(c)
    setSheetOpen(true)
  }

  async function handleSave(data: {
    cidades_em_ordem: CidadeGrupo[]
    capacidade_maxima: number
    peso_total: number
    rota_id?: number
    nome?: string
    motorista_id?: number
    status: string
  }) {
    if (editingCarregamento) {
      await handleUpdate(editingCarregamento.id, data)
    } else {
      const result = await handleCreate(data)
      setEditingCarregamento(result)
      return result.id
    }
  }

  if (isLoading) {
    return (
      <PageTemplate title="Carregamentos" description="Gerenciamento de carregamentos">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </PageTemplate>
    )
  }

  return (
    <PageTemplate
      title="Carregamentos"
      description="Monte romaneios de entrega, organize a ordem de pedidos e finalize carregamentos"
      actions={
        carregamentos.length > 0 ? (
          <Button className="cursor-pointer" onClick={openCreate}>
            <Plus className="h-4 w-4 mr-1.5" />
            Novo Carregamento
          </Button>
        ) : undefined
      }
    >
      {error && (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-sm text-destructive">{error}</CardTitle>
          </CardHeader>
        </Card>
      )}

      {carregamentos.length === 0 && !error ? (
        <EmptyState onAdd={openCreate} />
      ) : (
        <>
          {carregamentos.length > 5 && (
            <div className="relative max-w-sm">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Buscar carregamento..."
                value={tableSearch}
                onChange={(e) => setTableSearch(e.target.value)}
                className="pl-8 h-8 text-sm"
              />
            </div>
          )}
          <CarregamentosTable
            carregamentos={carregamentos}
            searchQuery={tableSearch}
            onEdit={openEdit}
            onFinalizar={(c) => openEdit(c)}
            onEnviarParaMotorista={(c) => openEdit(c)}
            onDelete={setDeleteTarget}
            onOpenChat={(c) => {
              window.open(`/dashboard/chat?carregamento=${c.id}`, "_blank")
            }}
          />
        </>
      )}

      <CarregamentoSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        carregamento={editingCarregamento}
        allRotas={allRotas}
        allCidades={allCidades}
        cidadeMap={cidadeMap}
        allMotoristas={motoristas}
        onSave={handleSave}
        onFinalizar={handleFinalizar}
        onEnviarParaMotorista={handleEnviarParaMotorista}
        onReenviarParaMotorista={handleReenviarParaMotorista}
        onMontar={handleMontar}
      />

      <DeleteDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
        carregamentoId={deleteTarget?.id ?? 0}
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
