import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MotoristaEntity } from './entities/motorista.entity';
import { MotoristaService } from './motorista.service';
import { MotoristaController } from './motorista.controller';

@Module({
    imports: [TypeOrmModule.forFeature([MotoristaEntity])],
    controllers: [MotoristaController],
    providers: [MotoristaService],
    exports: [MotoristaService],
})
export class MotoristaModule {}
