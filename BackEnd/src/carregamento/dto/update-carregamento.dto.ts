import { PartialType } from '@nestjs/mapped-types';
import { CreateCarregamentoDto } from './create-carregamento.dto';

export class UpdateCarregamentoDto extends PartialType(CreateCarregamentoDto) {}
