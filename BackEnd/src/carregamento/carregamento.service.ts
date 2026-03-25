import { BadRequestException, Inject, Injectable, Logger, NotFoundException, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { CarregamentoEntity, CidadeGrupo, PedidoOrdemItem } from './entities/carregamento.entity';
import { CreateCarregamentoDto } from './dto/create-carregamento.dto';
import { UpdateCarregamentoDto } from './dto/update-carregamento.dto';
import { PedidosEntity } from '../pedido/entities/pedidos.entity';
import { CidadeEntity, ClientesOrdem } from '../cidade/entities/cidade.entity';
import { RotaEntity } from '../rota/entities/rota.entity';
import { MotoristaService } from '../motorista/motorista.service';
import { TelegramService } from '../telegram/telegram.service';
import { ChatGateway } from '../chat/chat.gateway';

@Injectable()
export class CarregamentoService {
    private readonly logger = new Logger(CarregamentoService.name);
    private readonly learningThreshold: number;

    constructor(
        @InjectRepository(CarregamentoEntity)
        private readonly carregamentoRepository: Repository<CarregamentoEntity>,
        @InjectRepository(PedidosEntity)
        private readonly pedidoRepository: Repository<PedidosEntity>,
        @InjectRepository(CidadeEntity)
        private readonly cidadeRepository: Repository<CidadeEntity>,
        @InjectRepository(RotaEntity)
        private readonly rotaRepository: Repository<RotaEntity>,
        private readonly configService: ConfigService,
        private readonly motoristaService: MotoristaService,
        @Inject(forwardRef(() => TelegramService))
        private readonly telegramService: TelegramService,
        private readonly chatGateway: ChatGateway,
    ) {
        this.learningThreshold = this.configService.get<number>('LEARNING_THRESHOLD', 2);
    }

    async create(createCarregamentoDto: CreateCarregamentoDto) {
        if (createCarregamentoDto.rota_id && !createCarregamentoDto.nome) {
            const rota = await this.rotaRepository.findOneBy({ id: createCarregamentoDto.rota_id });
            if (rota) {
                createCarregamentoDto.nome = rota.nome;
            }
        }
        const carregamento = this.carregamentoRepository.create(createCarregamentoDto);
        return this.carregamentoRepository.save(carregamento);
    }

    findAll() {
        return this.carregamentoRepository.find({ order: { createdAt: 'DESC' } });
    }

    async findOne(id: number) {
        const carregamento = await this.carregamentoRepository.findOneBy({ id });
        if (!carregamento) {
            throw new NotFoundException(`Carregamento #${id} não encontrado`);
        }
        return carregamento;
    }

    async update(id: number, updateCarregamentoDto: UpdateCarregamentoDto) {
        if (updateCarregamentoDto.rota_id && !updateCarregamentoDto.nome) {
            const rota = await this.rotaRepository.findOneBy({ id: updateCarregamentoDto.rota_id });
            if (rota) {
                updateCarregamentoDto.nome = rota.nome;
            }
        }
        const carregamento = await this.carregamentoRepository.preload({
            id,
            ...updateCarregamentoDto,
        });
        if (!carregamento) {
            throw new NotFoundException(`Carregamento #${id} não encontrado`);
        }
        return this.carregamentoRepository.save(carregamento);
    }

    async remove(id: number) {
        const carregamento = await this.findOne(id);
        return this.carregamentoRepository.remove(carregamento);
    }

    /**
     * Monta o carregamento: busca pedidos agrupados por cidade, ordenados pela ordem_entrega.
     */
    async montarCarregamento(rotaId?: number, cidadeIds?: number[]): Promise<CidadeGrupo[]> {
        let cidadesOrdenadas: { cidade_id: number; ordem: number }[] = [];

        if (rotaId) {
            const rota = await this.rotaRepository.findOneBy({ id: rotaId });
            if (!rota) {
                throw new NotFoundException(`Rota #${rotaId} não encontrada`);
            }
            cidadesOrdenadas = [...rota.ordem_cidades].sort((a, b) => a.ordem - b.ordem);
        } else if (cidadeIds && cidadeIds.length > 0) {
            cidadesOrdenadas = cidadeIds.map((id, idx) => ({ cidade_id: id, ordem: idx + 1 }));
        } else {
            throw new BadRequestException('Informe rotaId ou cidades');
        }

        const resultado: CidadeGrupo[] = [];

        for (const item of cidadesOrdenadas) {
            const cidade = await this.cidadeRepository.findOneBy({ id: item.cidade_id });
            if (!cidade) continue;

            // Buscar pedidos sem baixa para essa cidade
            const cidadeNomePart = cidade.nome.split(' - ')[0].trim();
            const pedidos = await this.pedidoRepository
                .createQueryBuilder('pedido')
                .where('pedido.cidade ILIKE :nome', { nome: `%${cidadeNomePart}%` })
                .andWhere('pedido.baixa_sistema = :baixa', { baixa: false })
                .getMany();

            // Ordenar pelo ordem_entrega da cidade
            const ordemEntrega = cidade.ordem_entrega || [];
            const pedidosOrdenados = this.ordenarPedidos(pedidos, ordemEntrega);

            resultado.push({
                cidade_id: cidade.id,
                cidade_nome: cidade.nome,
                ordem: item.ordem,
                pedidos: pedidosOrdenados,
            });
        }

        return resultado;
    }

    /**
     * Ordena pedidos segundo o ordem_entrega da cidade.
     * Match por codcli (exato). Clientes sem match vão para o final.
     */
    private ordenarPedidos(
        pedidos: PedidosEntity[],
        ordemEntrega: ClientesOrdem[],
    ): PedidoOrdemItem[] {
        if (pedidos.length === 0) return [];

        const resultado: PedidoOrdemItem[] = [];
        const pedidosUsados = new Set<number>();
        let ordem = 1;

        // Normalizar codcli da ordem_entrega para 8 dígitos (string) para comparação
        // cidade armazena como number (ex: 20318), pedido armazena como number (ex: 20318)
        if (ordemEntrega.length > 0) {
            for (const oe of ordemEntrega) {
                // Buscar todos os pedidos que pertencem a este cliente por codcli
                const pedidosDoCliente = pedidos.filter(
                    (p) => !pedidosUsados.has(p.id) && p.codcli != null && p.codcli === oe.codcli,
                );

                for (const p of pedidosDoCliente) {
                    resultado.push({
                        numdoc: p.numdoc,
                        ordem: ordem++,
                        nomcli: p.nomcli,
                        peso_bruto: p.peso_bruto,
                        codcli: oe.codcli,
                        itens: p.itens || [],
                        endent: oe.endent,
                    });
                    pedidosUsados.add(p.id);
                }
            }
        }

        // Adicionar pedidos restantes (sem match por codcli)
        for (const p of pedidos) {
            if (pedidosUsados.has(p.id)) continue;
            resultado.push({
                numdoc: p.numdoc,
                ordem: ordem++,
                nomcli: p.nomcli,
                peso_bruto: p.peso_bruto,
                itens: p.itens || [],
            });
        }

        return resultado;
    }

    /**
     * Envia o carregamento para o motorista alocado via Telegram.
     */
    async enviarParaMotorista(id: number) {
        const carregamento = await this.findOne(id);

        if (carregamento.status !== 'rascunho') {
            throw new BadRequestException('Apenas carregamentos em rascunho podem ser enviados');
        }

        if (!carregamento.motorista_id) {
            throw new BadRequestException('Nenhum motorista alocado a este carregamento');
        }

        const motorista = await this.motoristaService.findOne(carregamento.motorista_id);

        if (!motorista.telegram_chat_id) {
            throw new BadRequestException(
                `Motorista "${motorista.nome}" ainda não vinculou o Telegram. ` +
                `Código de vinculação: ${motorista.codigo_vinculacao}`,
            );
        }

        await this.telegramService.enviarOrdemCarregamento(carregamento, motorista.telegram_chat_id);

        carregamento.status = 'enviado';
        const saved = await this.carregamentoRepository.save(carregamento);

        this.chatGateway.emitStatusUpdate(id, 'enviado', motorista.nome, carregamento.nome);

        return saved;
    }

    /**
     * Reenvia o carregamento para o motorista após edição pelo usuário.
     * Válido para status 'enviado' ou 'ordenado'. Volta o status para 'enviado'.
     */
    async reenviarParaMotorista(id: number) {
        const carregamento = await this.findOne(id);

        if (carregamento.status !== 'enviado' && carregamento.status !== 'ordenado') {
            throw new BadRequestException(
                'Apenas carregamentos enviados ou ordenados podem ser reenviados',
            );
        }

        if (!carregamento.motorista_id) {
            throw new BadRequestException('Nenhum motorista alocado a este carregamento');
        }

        const motorista = await this.motoristaService.findOne(carregamento.motorista_id);

        if (!motorista.telegram_chat_id) {
            throw new BadRequestException(
                `Motorista "${motorista.nome}" ainda não vinculou o Telegram. ` +
                `Código de vinculação: ${motorista.codigo_vinculacao}`,
            );
        }

        await this.telegramService.reenviarOrdemCarregamento(carregamento, motorista.telegram_chat_id);

        carregamento.status = 'enviado';
        const saved = await this.carregamentoRepository.save(carregamento);

        this.chatGateway.emitStatusUpdate(id, 'enviado', motorista.nome, carregamento.nome);

        return saved;
    }

    /**
     * Confirma a ordenação feita pelo motorista (endpoint REST de fallback).
     * A confirmação principal é feita diretamente pelo TelegramService.
     */
    async confirmarOrdenacao(id: number) {
        const carregamento = await this.findOne(id);

        if (carregamento.status !== 'enviado' && carregamento.status !== 'ordenado') {
            throw new BadRequestException('Carregamento não está aguardando ordenação do motorista');
        }

        if (carregamento.status === 'ordenado') {
            return carregamento; // Already confirmed
        }

        carregamento.status = 'ordenado';
        const saved = await this.carregamentoRepository.save(carregamento);

        const motorista = carregamento.motorista;
        this.chatGateway.emitStatusUpdate(id, 'ordenado', motorista?.nome, carregamento.nome);

        return saved;
    }

    /**
     * Rebuilds `cidades_em_ordem` from the flat confirmed order.
     */
    private rebuildCidadesFromFlatOrder(
        originalCidades: CidadeGrupo[],
        flatOrder: { numdoc: string; nomcli: string; cidade_nome: string; peso_bruto: number }[],
    ): CidadeGrupo[] {
        // Build lookup for itens from original data so they are preserved
        const itensMap = new Map<string, PedidoOrdemItem['itens']>();
        for (const cidade of originalCidades) {
            for (const p of cidade.pedidos) {
                if (p.itens && p.itens.length > 0) {
                    itensMap.set(p.numdoc, p.itens);
                }
            }
        }

        // Group flat order by city, preserving the flat sequence
        const cidadeMap = new Map<string, PedidoOrdemItem[]>();
        let globalOrdem = 1;

        for (const item of flatOrder) {
            const key = item.cidade_nome;
            if (!cidadeMap.has(key)) {
                cidadeMap.set(key, []);
            }
            cidadeMap.get(key)!.push({
                numdoc: item.numdoc,
                ordem: globalOrdem++,
                nomcli: item.nomcli,
                peso_bruto: item.peso_bruto,
                itens: itensMap.get(item.numdoc),
            });
        }

        // Rebuild cidade groups maintaining original cidade_id
        const result: CidadeGrupo[] = [];
        let cidadeOrdem = 1;

        // Process in the order cities first appear in flatOrder
        const seenCities = new Set<string>();
        for (const item of flatOrder) {
            if (seenCities.has(item.cidade_nome)) continue;
            seenCities.add(item.cidade_nome);

            const original = originalCidades.find(c => c.cidade_nome === item.cidade_nome);
            const pedidos = cidadeMap.get(item.cidade_nome) || [];

            // Re-index pedidos within city
            pedidos.forEach((p, idx) => { p.ordem = idx + 1; });

            result.push({
                cidade_id: original?.cidade_id || 0,
                cidade_nome: item.cidade_nome,
                ordem: cidadeOrdem++,
                pedidos,
            });
        }

        return result;
    }

    /**
     * Finaliza o carregamento: dá baixa em todos os pedidos e aplica o learning.
     */
    async finalizarCarregamento(id: number) {
        const carregamento = await this.findOne(id);

        if (carregamento.status === 'finalizado') {
            throw new BadRequestException('Carregamento já foi finalizado');
        }

        if (carregamento.status !== 'ordenado') {
            throw new BadRequestException('O carregamento precisa ser ordenado pelo motorista antes de finalizar');
        }

        // Dar baixa em todos os pedidos
        for (const cidade of carregamento.cidades_em_ordem) {
            for (const pedido of cidade.pedidos) {
                const pedidoEntity = await this.pedidoRepository.findOneBy({ numdoc: pedido.numdoc });
                if (pedidoEntity) {
                    pedidoEntity.baixa_sistema = true;
                    await this.pedidoRepository.save(pedidoEntity);
                }
            }
        }

        // Aplicar learning
        await this.processLearning(carregamento);

        // Marcar como finalizado
        carregamento.status = 'finalizado';
        return this.carregamentoRepository.save(carregamento);
    }

    /**
     * Adiciona um pedido ao carregamento pelo numdoc.
     */
    async addPedido(id: number, numdoc: string) {
        const carregamento = await this.findOne(id);

        if (carregamento.status === 'finalizado') {
            throw new BadRequestException('Não é possível alterar um carregamento finalizado');
        }

        const pedido = await this.pedidoRepository.findOneBy({ numdoc });
        if (!pedido) {
            throw new NotFoundException(`Pedido com numdoc '${numdoc}' não encontrado`);
        }

        // Verificar duplicatas
        for (const cidade of carregamento.cidades_em_ordem) {
            if (cidade.pedidos.some(p => p.numdoc === numdoc)) {
                throw new BadRequestException(`Pedido ${numdoc} já está neste carregamento`);
            }
        }

        // Encontrar o grupo de cidade correspondente
        const cidadeNome = pedido.cidade;
        const cidadeNomePart = cidadeNome.split(' - ')[0].trim().toUpperCase();
        let cidadeGrupo = carregamento.cidades_em_ordem.find(
            c => c.cidade_nome.split(' - ')[0].trim().toUpperCase() === cidadeNomePart,
        );

        if (!cidadeGrupo) {
            const cidadeEntity = await this.cidadeRepository
                .createQueryBuilder('cidade')
                .where('cidade.nome ILIKE :nome', { nome: `%${cidadeNomePart}%` })
                .getOne();

            const novoGrupo: CidadeGrupo = {
                cidade_id: cidadeEntity?.id || 0,
                cidade_nome: cidadeNome,
                ordem: carregamento.cidades_em_ordem.length + 1,
                pedidos: [],
            };
            carregamento.cidades_em_ordem.push(novoGrupo);
            cidadeGrupo = novoGrupo;
        }

        // Buscar endent da ordem_entrega da cidade, se disponível
        let endent: string | undefined;
        if (cidadeGrupo.cidade_id) {
            const cidadeComOrdem = await this.cidadeRepository.findOneBy({ id: cidadeGrupo.cidade_id });
            if (cidadeComOrdem?.ordem_entrega) {
                const nomUpper = pedido.nomcli.trim().toUpperCase();
                const match = cidadeComOrdem.ordem_entrega.find(oe => {
                    const oe_endent = (oe.endent || '').toUpperCase();
                    return oe_endent && (
                        nomUpper.includes(oe_endent) ||
                        oe_endent.includes(nomUpper) ||
                        nomUpper.split(' ')[0] === oe_endent.split(' ')[0]
                    );
                });
                endent = match?.endent;
            }
        }

        cidadeGrupo.pedidos.push({
            numdoc: pedido.numdoc,
            ordem: cidadeGrupo.pedidos.length + 1,
            nomcli: pedido.nomcli,
            peso_bruto: pedido.peso_bruto,
            itens: pedido.itens || [],
            endent,
        });

        // Recalcular peso total
        carregamento.peso_total = carregamento.cidades_em_ordem.reduce(
            (total, c) => total + c.pedidos.reduce((sum, p) => sum + p.peso_bruto, 0),
            0,
        );

        return this.carregamentoRepository.save(carregamento);
    }

    /**
     * Auto-learning: quando a ordenação de clientes dentro de uma cidade
     * é alterada em 2+ carregamentos finalizados, atualiza o ordem_entrega da cidade.
     */
    private async processLearning(carregamento: CarregamentoEntity) {
        for (const cidadeGrupo of carregamento.cidades_em_ordem) {
            if (cidadeGrupo.pedidos.length <= 1) continue;

            const cidade = await this.cidadeRepository.findOneBy({ id: cidadeGrupo.cidade_id });
            if (!cidade || !cidade.ordem_entrega || cidade.ordem_entrega.length === 0) continue;

            // Extrair sequência de nomcli do carregamento atual (na ordem definida pelo usuário)
            const sequenciaAtual = cidadeGrupo.pedidos
                .sort((a, b) => a.ordem - b.ordem)
                .map(p => p.nomcli.trim().toUpperCase());

            // Buscar outros carregamentos finalizados que incluem esta cidade
            const outrosCarregamentos = await this.carregamentoRepository
                .createQueryBuilder('c')
                .where('c.status = :status', { status: 'finalizado' })
                .andWhere('c.id != :id', { id: carregamento.id })
                .getMany();

            let matchCount = 0;

            for (const outro of outrosCarregamentos) {
                const outraCidadeGrupo = outro.cidades_em_ordem?.find(
                    c => c.cidade_id === cidadeGrupo.cidade_id,
                );
                if (!outraCidadeGrupo || outraCidadeGrupo.pedidos.length <= 1) continue;

                const sequenciaOutro = outraCidadeGrupo.pedidos
                    .sort((a, b) => a.ordem - b.ordem)
                    .map(p => p.nomcli.trim().toUpperCase());

                if (this.mesmaOrdemRelativa(sequenciaAtual, sequenciaOutro)) {
                    matchCount++;
                }
            }

            // Se matchCount + 1 (atual) >= threshold, atualizar
            if (matchCount + 1 >= this.learningThreshold) {
                await this.atualizarOrdemEntregaCidade(cidade, cidadeGrupo);
                this.logger.log(
                    `Learning: Ordem de entrega da cidade "${cidade.nome}" atualizada com base em ${matchCount + 1} carregamentos`,
                );
            }
        }
    }

    /**
     * Verifica se duas sequências mantêm a mesma ordem relativa
     * para os clientes em comum.
     */
    private mesmaOrdemRelativa(seq1: string[], seq2: string[]): boolean {
        const comuns = seq1.filter(c => seq2.includes(c));
        if (comuns.length < 2) return false;

        const ordemEm1 = comuns.map(c => seq1.indexOf(c));
        const ordemEm2 = comuns.map(c => seq2.indexOf(c));

        for (let i = 0; i < ordemEm1.length - 1; i++) {
            if ((ordemEm1[i] < ordemEm1[i + 1]) !== (ordemEm2[i] < ordemEm2[i + 1])) {
                return false;
            }
        }

        return true;
    }

    /**
     * Atualiza o ordem_entrega da cidade com base na ordenação do carregamento.
     * Clientes com codcli são reposicionados. Clientes sem match mantêm posição.
     */
    private async atualizarOrdemEntregaCidade(cidade: CidadeEntity, cidadeGrupo: CidadeGrupo) {
        const ordemAtual = [...cidade.ordem_entrega];

        // Pegar os codcli dos pedidos do carregamento (quando disponíveis)
        const pedidosComCodcli = cidadeGrupo.pedidos
            .sort((a, b) => a.ordem - b.ordem)
            .filter(p => p.codcli !== undefined && p.codcli !== null);

        if (pedidosComCodcli.length < 2) return; // Precisa de pelo menos 2 para reordenar

        // Reordenar: colocar os codcli na nova ordem
        const codclisReordenados = pedidosComCodcli.map(p => p.codcli!);
        const codclisSet = new Set(codclisReordenados);

        // Separar entries que serão reordenados e os que ficam
        const entriesParaReordenar = ordemAtual.filter(e => codclisSet.has(e.codcli));
        const entriesQueFicam = ordemAtual.filter(e => !codclisSet.has(e.codcli));

        // Reordenar as entries conforme a nova sequência
        const entriesReordenados = codclisReordenados
            .map(codcli => entriesParaReordenar.find(e => e.codcli === codcli))
            .filter((e): e is ClientesOrdem => e !== undefined);

        // Montar nova ordem: reordenados primeiro, depois os que ficam
        const novaOrdem: ClientesOrdem[] = [
            ...entriesReordenados,
            ...entriesQueFicam,
        ].map((entry, idx) => ({ ...entry, ordem: idx + 1 }));

        cidade.ordem_entrega = novaOrdem;
        await this.cidadeRepository.save(cidade);
    }
}
