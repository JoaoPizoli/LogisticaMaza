import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PedidosEntity } from '../pedido/entities/pedidos.entity';
import { PedidosSyncService } from './pedidos-sync.service';
import { ErpConnectionService } from './erp-connection.service';

@Module({
    imports: [TypeOrmModule.forFeature([PedidosEntity])],
    providers: [PedidosSyncService, ErpConnectionService],
})
export class WorkersModule {}
