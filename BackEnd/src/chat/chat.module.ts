import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MensagemChatEntity } from './entities/mensagem-chat.entity';
import { ChatService } from './chat.service';
import { ChatGateway } from './chat.gateway';
import { ChatController } from './chat.controller';
import { TelegramModule } from '../telegram/telegram.module';
import { CarregamentoEntity } from '../carregamento/entities/carregamento.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([MensagemChatEntity, CarregamentoEntity]),
        forwardRef(() => TelegramModule),
    ],
    controllers: [ChatController],
    providers: [ChatService, ChatGateway],
    exports: [ChatService, ChatGateway],
})
export class ChatModule {}
