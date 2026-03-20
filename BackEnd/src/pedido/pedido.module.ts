import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PedidosEntity } from './entities/pedidos.entity';
import { PedidoService } from './pedido.service';
import { PedidoController } from './pedido.controller';

@Module({
    imports: [TypeOrmModule.forFeature([PedidosEntity])],
    controllers: [PedidoController],
    providers: [PedidoService],
})
export class PedidoModule {}
