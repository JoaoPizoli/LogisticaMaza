import { IsArray, IsBoolean, IsDateString, IsNumber, IsOptional, IsString } from 'class-validator';
import { PedidoItem } from '../entities/pedidos.entity';

export class CreatePedidoDto {
    @IsString()
    nomcli: string;

    @IsString()
    @IsOptional()
    descri?: string;

    @IsString()
    nomven: string;

    @IsNumber()
    @IsOptional()
    qtdite?: number;

    @IsString()
    @IsOptional()
    unidade?: string;

    @IsDateString()
    data_emissao: Date;

    @IsString()
    hora_emissao: string;

    @IsString()
    numdoc: string;

    @IsNumber()
    peso_bruto: number;

    @IsString()
    cidade: string;

    @IsString()
    transportadora: string;

    @IsString()
    @IsOptional()
    status_pedido?: string;

    @IsString()
    @IsOptional()
    sitfin?: string;

    @IsString()
    @IsOptional()
    redespacho?: string;

    @IsString()
    @IsOptional()
    desuni?: string;

    @IsArray()
    @IsOptional()
    itens?: PedidoItem[];

    @IsBoolean()
    @IsOptional()
    baixa_sistema?: boolean;
}
