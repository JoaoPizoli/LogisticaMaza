import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

export interface PedidoItem {
    descri: string;
    qtdite: number;
    unidade: string;
    desuni: string;
}

@Entity()
export class PedidosEntity {

    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    nomcli: string;

    @Column({ nullable: true })
    descri: string;

    @Column()
    nomven: string;

    @Column({ nullable: true })
    qtdite: number;

    @Column({ nullable: true })
    unidade: string;

    @Column()
    data_emissao: Date;

    @Column()
    hora_emissao: string;

    @Column()
    numdoc: string;

    @Column({ type: 'float' })
    peso_bruto: number;

    @Column()
    cidade: string;

    @Column()
    transportadora: string;

    @Column()
    status_pedido: string;

    @Column()
    sitfin: string;

    @Column({ nullable: true })
    redespacho: string;

    @Column({ nullable: true })
    desuni: string;

    @Column({ nullable: true })
    codcli: number;

    @Column({ type: 'jsonb', default: [] })
    itens: PedidoItem[];

    @Column({ default: false })
    baixa_sistema: boolean;
}