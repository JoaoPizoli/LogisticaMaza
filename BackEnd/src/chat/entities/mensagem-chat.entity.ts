import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class MensagemChatEntity {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    carregamento_id: number;

    @Column()
    remetente: string; // 'usuario' | 'motorista'

    @Column({ type: 'text' })
    conteudo: string;

    @CreateDateColumn()
    createdAt: Date;
}
