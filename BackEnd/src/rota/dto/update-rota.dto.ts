import { PartialType } from '@nestjs/mapped-types';
import { CreateRotaDto } from './create-rota.dto';

export class UpdateRotaDto extends PartialType(CreateRotaDto) {}
