import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TelegramService } from './telegram.service';
import { MotoristaModule } from '../motorista/motorista.module';
import { ChatModule } from '../chat/chat.module';
import { CarregamentoEntity } from '../carregamento/entities/carregamento.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([CarregamentoEntity]),
        MotoristaModule,
        forwardRef(() => ChatModule),
    ],
    providers: [TelegramService],
    exports: [TelegramService],
})
export class TelegramModule {}
