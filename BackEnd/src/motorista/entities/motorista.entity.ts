import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

@Entity()
export class MotoristaEntity {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    nome: string;

    @Column({ nullable: true })
    telefone: string;

    @Column({ nullable: true })
    telegram_chat_id: string;

    @Column({ unique: true })
    codigo_vinculacao: string;

    @Column({ default: true })
    ativo: boolean;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
