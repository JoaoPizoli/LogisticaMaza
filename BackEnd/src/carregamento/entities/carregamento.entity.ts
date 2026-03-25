import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { PedidoItem } from "../../pedido/entities/pedidos.entity";
import { MotoristaEntity } from "../../motorista/entities/motorista.entity";

export interface PedidoOrdemItem {
    numdoc: string;
    ordem: number;
    nomcli: string;
    peso_bruto: number;
    codcli?: number;
    itens?: PedidoItem[];
    endent?: string;
}

export interface CidadeGrupo {
    cidade_id: number;
    cidade_nome: string;
    ordem: number;
    pedidos: PedidoOrdemItem[];
}

@Entity()
export class CarregamentoEntity {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ default: 'rascunho' })
    status: string;

    @Column({ nullable: true })
    nome: string;

    @Column({ type: 'jsonb', default: [] })
    cidades_em_ordem: CidadeGrupo[];

    @Column({ nullable: true })
    rota_id: number;

    @Column({ nullable: true })
    motorista_id: number;

    @ManyToOne(() => MotoristaEntity, { nullable: true, eager: true })
    @JoinColumn({ name: 'motorista_id' })
    motorista: MotoristaEntity;

    @Column()
    capacidade_maxima: number;

    @Column({ type: 'float', default: 0 })
    peso_total: number;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
