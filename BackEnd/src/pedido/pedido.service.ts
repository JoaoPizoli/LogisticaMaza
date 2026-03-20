import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PedidosEntity } from './entities/pedidos.entity';
import { CreatePedidoDto } from './dto/create-pedido.dto';
import { UpdatePedidoDto } from './dto/update-pedido.dto';

@Injectable()
export class PedidoService {
    private readonly logger = new Logger(PedidoService.name);

    constructor(
        @InjectRepository(PedidosEntity)
        private readonly pedidoRepository: Repository<PedidosEntity>,
    ) {}

    create(createPedidoDto: CreatePedidoDto) {
        const pedido = this.pedidoRepository.create(createPedidoDto);
        return this.pedidoRepository.save(pedido);
    }

    findAll(filters?: { nomven?: string; dataInicio?: string; dataFim?: string; cidade?: string; baixaSistema?: string; numdoc?: string }) {
        const qb = this.pedidoRepository.createQueryBuilder('pedido');

        if (filters?.numdoc) {
            qb.andWhere('pedido.numdoc = :numdoc', { numdoc: filters.numdoc });
            return qb.getMany();
        }

        if (filters?.nomven) {
            qb.andWhere('pedido.nomven ILIKE :nomven', { nomven: `%${filters.nomven}%` });
        }

        if (filters?.dataInicio) {
            qb.andWhere('pedido.data_emissao >= :dataInicio', { dataInicio: filters.dataInicio });
        } else {
            // Default: últimos 10 dias quando sem filtro de data
            const defaultStart = new Date();
            defaultStart.setDate(defaultStart.getDate() - 10);
            qb.andWhere('pedido.data_emissao >= :dataInicio', {
                dataInicio: defaultStart.toISOString().split('T')[0],
            });
        }

        if (filters?.dataFim) {
            qb.andWhere('pedido.data_emissao <= :dataFim', { dataFim: filters.dataFim });
        }

        if (filters?.cidade) {
            qb.andWhere('pedido.cidade ILIKE :cidade', { cidade: `%${filters.cidade}%` });
        }

        if (filters?.baixaSistema !== undefined && filters.baixaSistema !== '') {
            const valor = filters.baixaSistema === 'true';
            qb.andWhere('pedido.baixa_sistema = :baixaSistema', { baixaSistema: valor });
        }

        return qb.orderBy('pedido.data_emissao', 'DESC').addOrderBy('pedido.hora_emissao', 'DESC').take(5000).getMany();
    }

    async findOne(id: number) {
        const pedido = await this.pedidoRepository.findOneBy({ id });
        if (!pedido) {
            throw new NotFoundException(`Pedido #${id} não encontrado`);
        }
        return pedido;
    }

    async update(id: number, updatePedidoDto: UpdatePedidoDto) {
        const pedido = await this.pedidoRepository.preload({
            id,
            ...updatePedidoDto,
        });
        if (!pedido) {
            throw new NotFoundException(`Pedido #${id} não encontrado`);
        }
        return this.pedidoRepository.save(pedido);
    }

    async remove(id: number) {
        const pedido = await this.findOne(id);
        return this.pedidoRepository.remove(pedido);
    }

    async baixaSistema(numdoc: string) {
        const pedido = await this.pedidoRepository.findOneBy({ numdoc });
        if (!pedido) {
            throw new NotFoundException(`Pedido com numdoc '${numdoc}' não encontrado`);
        }
        pedido.baixa_sistema = true;
        return this.pedidoRepository.save(pedido);
    }
}
