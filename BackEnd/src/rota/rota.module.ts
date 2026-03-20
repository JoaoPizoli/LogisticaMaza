import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RotaEntity } from './entities/rota.entity';
import { RotaService } from './rota.service';
import { RotaController } from './rota.controller';

@Module({
    imports: [TypeOrmModule.forFeature([RotaEntity])],
    controllers: [RotaController],
    providers: [RotaService],
})
export class RotaModule {}
