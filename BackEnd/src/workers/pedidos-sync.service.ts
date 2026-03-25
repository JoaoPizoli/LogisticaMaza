import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Interval } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { PedidosEntity, PedidoItem } from '../pedido/entities/pedidos.entity';
import { ErpConnectionService } from './erp-connection.service';

interface ErpPedido {
    nomcli: string;
    nomven: string;
    data_emissao: Date;
    hora_emissao: string;
    numdoc: string;
    codcli: string;
    peso_bruto: number;
    cidade: string;
    transportadora: string;
    status_pedido: string;
    sitfin: string;
    redespacho: string;
    itens_list: string;
}

const ERP_QUERY = `
    SELECT
        NUMDOC AS numdoc,
        MIN(NOMCLI) AS nomcli,
        MIN(NOMVEN) AS nomven,
        MIN(CIDADE) AS cidade,
        MIN(DATA_EMISSAO) AS data_emissao,
        MIN(HORA_EMISSAO) AS hora_emissao,
        MAX(PESO_BRUTO) AS peso_bruto,
        MIN(TRANSPORTADORA) AS transportadora,
        MIN(STATUS_PEDIDO) AS status_pedido,
        MIN(SITFIN) AS sitfin,
        MIN(REDESPACHO) AS redespacho,
        MIN(CODCLI) AS codcli,
        GROUP_CONCAT(
            CONCAT(
                IFNULL(DESCRI, ''), ';;',
                IFNULL(QTDITE, 0), ';;',
                IFNULL(UNIDADE, ''), ';;',
                IFNULL(DESUNI, '')
            ) SEPARATOR '||'
        ) AS itens_list
    FROM VW_PEDIDOS_MAZA
    WHERE TRANSPORTADORA NOT LIKE '%RETIRA%'
    AND TRANSPORTADORA IS NOT NULL
    AND SITFIN = 'LIBERADO'
    AND REDESPACHO IS NULL
    AND DATA_EMISSAO >= CURDATE() - INTERVAL ? DAY
    GROUP BY NUMDOC
    ORDER BY MIN(DATA_EMISSAO) DESC, MIN(HORA_EMISSAO) DESC
`;

@Injectable()
export class PedidosSyncService {
    private readonly logger = new Logger(PedidosSyncService.name);
    private isRunning = false;

    private readonly syncDaysInterval: number;

    constructor(
        @InjectRepository(PedidosEntity)
        private readonly pedidoRepository: Repository<PedidosEntity>,
        private readonly erpConnection: ErpConnectionService,
        private readonly configService: ConfigService,
    ) {
        this.syncDaysInterval = this.configService.get<number>('SYNC_DAYS_INTERVAL') || 7;
    }

    @Interval(5000)
    async syncPedidos() {
        if (this.isRunning) return;
        this.isRunning = true;

        try {
            const erpPedidos = await this.erpConnection.query<ErpPedido>(
                ERP_QUERY,
                [this.syncDaysInterval],
            );

            if (erpPedidos.length === 0) return;

            const pedidosAgrupados = erpPedidos.map((p) => {
                const itens = this.parseItensList(p.itens_list);
                return {
                    nomcli: String(p.nomcli || ''),
                    nomven: String(p.nomven || ''),
                    data_emissao: p.data_emissao,
                    hora_emissao: String(p.hora_emissao || ''),
                    numdoc: String(p.numdoc),
                    peso_bruto: parseFloat(String(p.peso_bruto)) || 0,
                    cidade: String(p.cidade || ''),
                    transportadora: String(p.transportadora || ''),
                    status_pedido: String(p.status_pedido || ''),
                    sitfin: String(p.sitfin || ''),
                    redespacho: p.redespacho ? String(p.redespacho) : null,
                    codcli: p.codcli ? parseInt(String(p.codcli), 10) : null,
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

    private parseItensList(itensListStr: string): PedidoItem[] {
        if (!itensListStr) return [];
        return itensListStr.split('||').map((itemStr) => {
            const [descri, qtdite, unidade, desuni] = itemStr.split(';;');
            return {
                descri: descri || '',
                qtdite: parseInt(qtdite, 10) || 0,
                unidade: unidade || '',
                desuni: desuni || '',
            };
        });
    }
}
