import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Interval } from '@nestjs/schedule';
import { PedidosEntity, PedidoItem } from '../pedido/entities/pedidos.entity';
import { ErpConnectionService } from './erp-connection.service';

interface ErpPedido {
    nomcli: string;
    descri: string;
    nomven: string;
    qtdite: number;
    unidade: string;
    data_emissao: Date;
    hora_emissao: string;
    numdoc: string;
    peso_bruto: number;
    cidade: string;
    transportadora: string;
    status_pedido: string;
    sitfin: string;
    redespacho: string;
    desuni: string;
}

const ERP_QUERY = `
    SELECT
        nomcli, descri, nomven, qtdite, unidade,
        data_emissao, hora_emissao, numdoc, peso_bruto,
        cidade, transportadora, status_pedido, sitfin,
        redespacho, desuni
    FROM VW_PEDIDOS_MAZA
    WHERE TRANSPORTADORA = 'MAZA PRODUTOS QUIMICOS LTDA' 
    AND SITFIN = 'LIBERADO'
    AND REDESPACHO IS NULL
    AND DATA_EMISSAO >= CURDATE() - INTERVAL 7 DAY
    ORDER BY DATA_EMISSAO DESC;
`;

@Injectable()
export class PedidosSyncService {
    private readonly logger = new Logger(PedidosSyncService.name);
    private isRunning = false;

    constructor(
        @InjectRepository(PedidosEntity)
        private readonly pedidoRepository: Repository<PedidosEntity>,
        private readonly erpConnection: ErpConnectionService,
    ) {}

    @Interval(5000)
    async syncPedidos() {
        if (this.isRunning) return;
        this.isRunning = true;

        try {
            const erpPedidos = await this.erpConnection.query<ErpPedido>(ERP_QUERY);

            if (erpPedidos.length === 0) return;

            // Normaliza as chaves para minúsculo logo no início
            const pedidosNormalizados = erpPedidos.map((p) => {
                const normalized: Record<string, unknown> = {};
                for (const [key, value] of Object.entries(p)) {
                    normalized[key.toLowerCase()] = value;
                }
                normalized.qtdite = parseInt(String(normalized.qtdite), 10) || 0;
                normalized.peso_bruto = parseFloat(String(normalized.peso_bruto)) || 0;
                return normalized;
            });

            // Agrupa linhas por numdoc
            const grouped = new Map<string, Record<string, unknown>[]>();
            for (const row of pedidosNormalizados) {
                const key = String(row.numdoc);
                if (!grouped.has(key)) grouped.set(key, []);
                grouped.get(key)!.push(row);
            }

            // Monta um pedido por grupo, coletando itens de todas as linhas
            const pedidosAgrupados = Array.from(grouped.entries()).map(([numdoc, rows]) => {
                const first = rows[0];
                const itens: PedidoItem[] = rows.map((r) => ({
                    descri: String(r.descri || ''),
                    qtdite: Number(r.qtdite) || 0,
                    unidade: String(r.unidade || ''),
                    desuni: String(r.desuni || ''),
                }));
                return {
                    nomcli: first.nomcli,
                    nomven: first.nomven,
                    data_emissao: first.data_emissao,
                    hora_emissao: first.hora_emissao,
                    numdoc,
                    peso_bruto: first.peso_bruto,
                    cidade: first.cidade,
                    transportadora: first.transportadora,
                    status_pedido: first.status_pedido,
                    sitfin: first.sitfin,
                    redespacho: first.redespacho,
                    descri: itens[0]?.descri || '',
                    qtdite: itens.reduce((sum, i) => sum + i.qtdite, 0),
                    unidade: itens[0]?.unidade || '',
                    desuni: itens[0]?.desuni || '',
                    itens,
                };
            });

            const numdocs = pedidosAgrupados.map((p) => p.numdoc);

            const existentes = await this.pedidoRepository.find({
                where: { numdoc: In(numdocs) },
                select: ['numdoc'],
            });

            const numdocsExistentes = new Set(existentes.map((p) => p.numdoc));
            const novos = pedidosAgrupados.filter((p) => !numdocsExistentes.has(p.numdoc));

            if (novos.length === 0) return;

            const entidades = novos.map((p) =>
                this.pedidoRepository.create({
                    ...p,
                    baixa_sistema: false,
                } as Partial<PedidosEntity>),
            );

            const BATCH_SIZE = 100;
            for (let i = 0; i < entidades.length; i += BATCH_SIZE) {
                await this.pedidoRepository.save(entidades.slice(i, i + BATCH_SIZE));
            }
            this.logger.log(`${novos.length} pedido(s) sincronizado(s) do ERP`);
        } catch (error) {
            this.logger.error('Erro ao sincronizar pedidos do ERP', error);
        } finally {
            this.isRunning = false;
        }
    }
}
