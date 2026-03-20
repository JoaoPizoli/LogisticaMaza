import { IsNumber } from 'class-validator';

export class OrdemCidadeDto {
    @IsNumber()
    cidade_id: number;

    @IsNumber()
    ordem: number;
}
