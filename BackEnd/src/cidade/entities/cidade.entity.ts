import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

export interface ClientesOrdem {
    codcli: number;
    ordem: number;
    endent?: string;
}

@Entity()
export class CidadeEntity {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    nome: string;

    @Column({ type: 'jsonb', default: [] })
    ordem_entrega: ClientesOrdem[];

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}