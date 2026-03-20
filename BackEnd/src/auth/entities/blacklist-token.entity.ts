import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class BlacklistTokenEntity {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    token: string;

    @Column()
    expiresAt: Date;

    @CreateDateColumn()
    createdAt: Date;
}
