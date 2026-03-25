import type { Pedido } from "@/types"

const representantes = [
  "CARLOS SILVA",
  "MARIA OLIVEIRA",
  "JOÃO SANTOS",
  "ANA COSTA",
  "PEDRO FERREIRA",
  "LUCIA ALMEIDA",
]

const cidades = [
  "São Paulo",
  "Rio de Janeiro",
  "Belo Horizonte",
  "Curitiba",
  "Porto Alegre",
  "Salvador",
  "Fortaleza",
  "Goiânia",
  "Campinas",
  "Uberlândia",
]

const transportadoras = [
  "TRANS RAPIDA LTDA",
  "EXPRESSO BRASIL",
  "LOG SUL TRANSPORTES",
  "RODOVIARIO NORTE",
  "FRETE FACIL",
]

const rotas = [
  "ROTA SUL",
  "ROTA NORTE",
  "ROTA LESTE",
  "ROTA OESTE",
  "ROTA CAPITAL",
]

const statusPedido = [
  "ABERTO",
  "FATURADO",
  "PARCIALMENTE ATENDIDO",
  "CANCELADO",
]

const produtos = [
  "TINTA ACRILICA BRANCA 18L",
  "TINTA LATEX MARFIM 3.6L",
  "MASSA CORRIDA PVA 25KG",
  "VERNIZ MARITIMO 3.6L",
  "ESMALTE SINTETICO PRETO 0.9L",
  "TINTA ACRILICA AZUL 18L",
  "SELADOR ACRILICO 18L",
  "FUNDO PREPARADOR 3.6L",
  "TINTA ESMALTE BRANCO 3.6L",
  "MASSA ACRILICA 25KG",
  "TINTA LATEX PALHA 18L",
  "REMOVEDOR DE TINTAS 1L",
  "TINTA ACRILICA VERDE 3.6L",
  "IMPERMEABILIZANTE 18L",
  "TEXTURA ACRILICA 25KG",
]

const clientes = [
  "LOJA DE TINTAS CENTRAL LTDA",
  "MATERIAIS DE CONSTRUCAO SILVA",
  "CASA DAS CORES EIRELI",
  "COMERCIAL PREDIAL ME",
  "TINTAS E VERNIZES BRAZIL",
  "ATACADAO DAS TINTAS",
  "CONSTRULAR MATERIAIS",
  "NORTE TINTAS COMERCIO",
  "DISTRIBUIDORA CORES VIVAS",
  "MEGA TINTAS ATACADO",
  "DEPÓSITO DE TINTAS CENTRAL",
  "COLORFIX COMERCIO LTDA",
]

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function randomDate(startDays: number, endDays: number): string {
  const now = new Date()
  const range = endDays - startDays
  const daysAgo = startDays + Math.floor(Math.random() * range)
  const date = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000)
  return date.toISOString().split("T")[0]
}

function randomHour(): string {
  const h = Math.floor(Math.random() * 10) + 7
  const m = Math.floor(Math.random() * 60)
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00`
}

function generateMockPedidos(): Pedido[] {
  const pedidos: Pedido[] = []

  for (let i = 1; i <= 50; i++) {
    const status = randomItem(statusPedido)
    const baixa = status === "FATURADO" ? Math.random() > 0.3 : false

    pedidos.push({
      id: i,
      nomcli: randomItem(clientes),
      descri: randomItem(produtos),
      nomven: randomItem(representantes),
      qtdite: Math.floor(Math.random() * 99) + 1,
      unidade: randomItem(["UN", "CX", "PC", "LT", "KG"]),
      data_emissao: randomDate(1, 90),
      hora_emissao: randomHour(),
      numdoc: String(100000 + i).padStart(6, "0"),
      peso_bruto: Math.round((Math.random() * 500 + 5) * 100) / 100,
      cidade: randomItem(cidades),
      transportadora: randomItem(transportadoras),
      status_pedido: status,
      sitfin: randomItem(["NORMAL", "ATRASADO", "EM DIA"]),
      redespacho: randomItem(["SIM", "NAO"]),
      desuni: randomItem(["001", "002", "003"]),
      baixa_sistema: baixa,
    })
  }

  return pedidos.sort(
    (a, b) =>
      new Date(b.data_emissao).getTime() - new Date(a.data_emissao).getTime()
  )
}

export const mockPedidos: Pedido[] = generateMockPedidos()
