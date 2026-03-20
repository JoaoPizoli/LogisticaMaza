import { IsOptional, IsString } from 'class-validator';

export class CreateMotoristaDto {
    @IsString()
    nome: string;

    @IsString()
    @IsOptional()
    telefone?: string;
}
