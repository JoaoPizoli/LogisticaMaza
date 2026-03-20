import { IsArray, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { OrdemCidadeDto } from './ordem-cidade.dto';

export class CreateRotaDto {
    @IsString()
    nome: string;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => OrdemCidadeDto)
    ordem_cidades: OrdemCidadeDto[];
}
