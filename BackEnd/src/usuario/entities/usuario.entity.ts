import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class UsuarioEntity {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    email: string;

    @Column()
    senha: string;
}