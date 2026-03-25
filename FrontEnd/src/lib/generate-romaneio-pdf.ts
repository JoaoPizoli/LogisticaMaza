import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import type { CidadeGrupo, PedidoItem } from "@/types"

interface RomaneioParams {
  id: number
  cidadesEmOrdem: CidadeGrupo[]
  capacidadeMaxima: number
  pesoTotal: number
  nome?: string
}

function formatItens(itens: PedidoItem[]): string {
  return itens
    .map((item) => {
      const qtd =
        item.qtdite % 1 === 0
          ? String(Math.round(item.qtdite))
          : item.qtdite.toFixed(2).replace(".", ",")
      const unidade = item.desuni || item.unidade || ""
      return `${item.descri} — Qtd: ${qtd} ${unidade}`.trim()
    })
    .join("\n")
}

export function generateRomaneioPdf({
  id,
  cidadesEmOrdem,
  capacidadeMaxima,
  pesoTotal,
  nome,
}: RomaneioParams) {
  const doc = new jsPDF("portrait", "mm", "a4")
  const pageWidth = doc.internal.pageSize.getWidth()

  const headerLabel = nome
    ? `ROMANEIO — ${nome}`
    : `ROMANEIO DE CARREGAMENTO #${id}`

  // ─── Header ───────────────────────────────────────────────────────────
  doc.setFontSize(16)
  doc.setFont("helvetica", "bold")
  doc.text(headerLabel, pageWidth / 2, 18, {
    align: "center",
  })

  doc.setFontSize(9)
  doc.setFont("helvetica", "normal")
  const dataAtual = new Date().toLocaleDateString("pt-BR")
  doc.text(`Data: ${dataAtual}`, pageWidth / 2, 24, { align: "center" })

  // ─── Summary ──────────────────────────────────────────────────
  const cidadesOrdenadas = [...cidadesEmOrdem].sort(
    (a, b) => a.ordem - b.ordem,
  )
  const totalPedidos = cidadesOrdenadas.reduce(
    (sum, c) => sum + c.pedidos.length,
    0,
  )

  doc.setFontSize(9)
  const summaryY = 30
  const col1X = 14
  const col2X = pageWidth / 2 + 5

  doc.setFont("helvetica", "bold")
  doc.text("Peso Total:", col1X, summaryY)
  doc.setFont("helvetica", "normal")
  doc.text(`${formatPeso(pesoTotal)} kg`, col1X + 22, summaryY)

  doc.setFont("helvetica", "bold")
  doc.text("Capacidade:", col2X, summaryY)
  doc.setFont("helvetica", "normal")
  doc.text(`${formatPeso(capacidadeMaxima)} kg`, col2X + 22, summaryY)

  doc.setFont("helvetica", "bold")
  doc.text("Pedidos:", col1X, summaryY + 5)
  doc.setFont("helvetica", "normal")
  doc.text(`${totalPedidos}`, col1X + 16, summaryY + 5)

  doc.setFont("helvetica", "bold")
  doc.text("Cidades:", col2X, summaryY + 5)
  doc.setFont("helvetica", "normal")
  doc.text(`${cidadesOrdenadas.length}`, col2X + 16, summaryY + 5)

  doc.setDrawColor(200, 200, 200)
  doc.line(14, summaryY + 8, pageWidth - 14, summaryY + 8)

  // ─── Build table rows ─────────────────────────────────────────
  type CellDef = string | { content: string; colSpan?: number; styles?: Record<string, unknown> }
  const tableBody: CellDef[][] = []
  let globalOrder = 1

  for (const cidade of cidadesOrdenadas) {
    const pedidosOrdenados = [...cidade.pedidos].sort(
      (a, b) => a.ordem - b.ordem,
    )

    for (const pedido of pedidosOrdenados) {
      const itensText =
        pedido.itens && pedido.itens.length > 0
          ? formatItens(pedido.itens)
          : ""

      tableBody.push([
        String(globalOrder),
        pedido.numdoc,
        pedido.nomcli,
        cidade.cidade_nome,
        formatPeso(pedido.peso_bruto),
        itensText,
      ])

      globalOrder++
    }
  }

  // ─── Render table ─────────────────────────────────────────────
  autoTable(doc, {
    startY: summaryY + 11,
    head: [["#", "Nº Doc", "Cliente", "Cidade", "Peso (kg)", "Itens"]],
    body: tableBody,
    theme: "grid",
    headStyles: {
      fillColor: [50, 50, 50],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 8,
      halign: "left",
      cellPadding: 2,
    },
    styles: {
      fontSize: 7.5,
      cellPadding: 1.5,
      lineColor: [210, 210, 210],
      lineWidth: 0.2,
      overflow: "linebreak",
      valign: "top",
    },
    columnStyles: {
      0: { cellWidth: 10, halign: "center", fontStyle: "bold" },
      1: { cellWidth: 18 },
      2: { cellWidth: 38 },
      3: { cellWidth: 28 },
      4: { cellWidth: 18, halign: "right" },
      5: { cellWidth: "auto", fontSize: 6.5, textColor: [80, 80, 80] },
    },
    didDrawPage: (data) => {
      const pageCount = doc.getNumberOfPages()
      doc.setFontSize(7)
      doc.setTextColor(150, 150, 150)
      doc.text(
        `Página ${data.pageNumber} de ${pageCount}`,
        pageWidth / 2,
        doc.internal.pageSize.getHeight() - 8,
        { align: "center" },
      )
    },
  })

  // ─── Download ─────────────────────────────────────────────────
  const filename = nome
    ? `romaneio-${nome.toLowerCase().replace(/\s+/g, '-')}.pdf`
    : `romaneio-carregamento-${id}.pdf`
  doc.save(filename)
}

function formatPeso(value: number): string {
  return value.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}
