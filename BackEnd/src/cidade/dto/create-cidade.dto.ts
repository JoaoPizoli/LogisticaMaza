import { IsArray, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class ClientesOrdemDto {
    @IsNumber()
    codcli: number;

    @IsNumber()
    ordem: number;

    @IsString()
    @IsOptional()
    endent: string;
}

export class CreateCidadeDto {
    @IsString()
    nome: string;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => ClientesOrdemDto)
    @IsOptional()
    ordem_entrega?: ClientesOrdemDto[];
}
