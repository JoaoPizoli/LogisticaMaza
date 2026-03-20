import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

export interface OrdemCidades {
    cidade_id: number;
    ordem: number;
}

@Entity()
export class RotaEntity {

    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    nome: string;

    @Column({ type: 'jsonb', default: [] })
    ordem_cidades: OrdemCidades[];

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}