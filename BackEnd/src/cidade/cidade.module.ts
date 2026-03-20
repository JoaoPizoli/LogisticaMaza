import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CidadeEntity } from './entities/cidade.entity';
import { CidadesService } from './cidades.service';
import { CidadeController } from './cidade.controller';

@Module({
    imports: [TypeOrmModule.forFeature([CidadeEntity])],
    controllers: [CidadeController],
    providers: [CidadesService],
})
export class CidadeModule {}
