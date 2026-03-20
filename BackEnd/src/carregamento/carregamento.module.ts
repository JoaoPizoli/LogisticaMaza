import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CarregamentoEntity } from './entities/carregamento.entity';
import { CarregamentoService } from './carregamento.service';
import { CarregamentoController } from './carregamento.controller';
import { PedidosEntity } from '../pedido/entities/pedidos.entity';
import { CidadeEntity } from '../cidade/entities/cidade.entity';
import { RotaEntity } from '../rota/entities/rota.entity';
import { MotoristaModule } from '../motorista/motorista.module';
import { TelegramModule } from '../telegram/telegram.module';
import { ChatModule } from '../chat/chat.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([CarregamentoEntity, PedidosEntity, CidadeEntity, RotaEntity]),
        MotoristaModule,
        forwardRef(() => TelegramModule),
        ChatModule,
    ],
    controllers: [CarregamentoController],
    providers: [CarregamentoService],
    exports: [CarregamentoService],
})
export class CarregamentoModule {}
