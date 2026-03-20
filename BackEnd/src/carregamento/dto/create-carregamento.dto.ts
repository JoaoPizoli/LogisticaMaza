import { IsArray, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { PedidoItem } from '../../pedido/entities/pedidos.entity';

class PedidoOrdemItemDto {
    @IsString()
    numdoc: string;

    @IsNumber()
    ordem: number;

    @IsString()
    nomcli: string;

    @IsNumber()
    peso_bruto: number;

    @IsNumber()
    @IsOptional()
    codcli?: number;

    @IsArray()
    @IsOptional()
    itens?: PedidoItem[];
}

class CidadeGrupoDto {
    @IsNumber()
    cidade_id: number;

    @IsString()
    cidade_nome: string;

    @IsNumber()
    ordem: number;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => PedidoOrdemItemDto)
    pedidos: PedidoOrdemItemDto[];
}

export class CreateCarregamentoDto {
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CidadeGrupoDto)
    @IsOptional()
    cidades_em_ordem?: CidadeGrupoDto[];

    @IsNumber()
    capacidade_maxima: number;

    @IsNumber()
    @IsOptional()
    peso_total?: number;

    @IsNumber()
    @IsOptional()
    rota_id?: number;

    @IsString()
    @IsOptional()
    status?: string;

    @IsNumber()
    @IsOptional()
    motorista_id?: number;
}
