export type PedidoItem = {
  descri: string
  qtdite: number
  unidade: string
  desuni: string
}

export type Pedido = {
  id: number
  nomcli: string
  descri: string
  nomven: string
  qtdite: number
  unidade: string
  data_emissao: string
  hora_emissao: string
  numdoc: string
  peso_bruto: number
  cidade: string
  transportadora: string
  status_pedido: string
  sitfin: string
  redespacho: string
  desuni: string
  itens?: PedidoItem[]
  baixa_sistema: boolean
}

export type PedidoFilters = {
  numdoc?: string
  nomven?: string[]
  dataInicio?: string
  dataFim?: string
  rota?: string
  cidade?: string
  estado?: string
  baixa_sistema?: string
}

export type Cidade = {
  id: number
  nome: string
}

export type ClientesOrdem = {
  codcli: number
  ordem: number
  endent: string
}

export type CidadeFull = {
  id: number
  nome: string
  ordem_entrega: ClientesOrdem[]
  createdAt: string
  updatedAt: string
}

export type Rota = {
  id: number
  nome: string
  ordem_cidades: { cidade_id: number; ordem: number }[]
}

export type PedidoOrdemItem = {
  numdoc: string
  ordem: number
  nomcli: string
  peso_bruto: number
  codcli?: number
  itens?: PedidoItem[]
  endent?: string
}

export type CidadeGrupo = {
  cidade_id: number
  cidade_nome: string
  ordem: number
  pedidos: PedidoOrdemItem[]
}

export type Motorista = {
  id: number
  nome: string
  telefone?: string
  telegram_chat_id?: string
  codigo_vinculacao: string
  ativo: boolean
  createdAt: string
  updatedAt: string
}

export type MensagemChat = {
  id: number
  carregamento_id: number
  remetente: 'usuario' | 'motorista'
  conteudo: string
  createdAt: string
}

export type Carregamento = {
  id: number
  status: 'rascunho' | 'enviado' | 'ordenado' | 'finalizado'
  cidades_em_ordem: CidadeGrupo[]
  nome?: string
  rota_id: number | null
  motorista_id: number | null
  motorista?: Motorista
  capacidade_maxima: number
  peso_total: number
  createdAt: string
  updatedAt: string
}
