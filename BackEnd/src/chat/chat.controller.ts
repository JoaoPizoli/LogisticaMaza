import { Controller, Get, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { ChatService } from './chat.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('chat')
export class ChatController {
    constructor(private readonly chatService: ChatService) {}

    @Get(':carregamentoId/mensagens')
    buscarMensagens(@Param('carregamentoId', ParseIntPipe) carregamentoId: number) {
        return this.chatService.buscarMensagens(carregamentoId);
    }
}
