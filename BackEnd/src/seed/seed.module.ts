import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsuarioEntity } from '../usuario/entities/usuario.entity';
import { MotoristaEntity } from '../motorista/entities/motorista.entity';
import { SeedService } from './seed.service';

@Module({
    imports: [TypeOrmModule.forFeature([UsuarioEntity, MotoristaEntity])],
    providers: [SeedService],
})
export class SeedModule {}
