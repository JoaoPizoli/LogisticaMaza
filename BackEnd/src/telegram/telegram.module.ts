import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TelegramService } from './telegram.service';
import { MotoristaModule } from '../motorista/motorista.module';
import { ChatModule } from '../chat/chat.module';
import { CarregamentoEntity } from '../carregamento/entities/carregamento.entity';
import { CidadeEntity } from '../cidade/entities/cidade.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([CarregamentoEntity, CidadeEntity]),
        MotoristaModule,
        forwardRef(() => ChatModule),
    ],
    providers: [TelegramService],
    exports: [TelegramService],
})
export class TelegramModule {}
