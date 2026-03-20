import {
    WebSocketGateway,
    WebSocketServer,
    SubscribeMessage,
    MessageBody,
    ConnectedSocket,
} from '@nestjs/websockets';
import { Inject, forwardRef } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { ChatService } from './chat.service';
import { TelegramService } from '../telegram/telegram.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CarregamentoEntity } from '../carregamento/entities/carregamento.entity';

@WebSocketGateway({ cors: { origin: '*' } })
export class ChatGateway {
    @WebSocketServer()
    server: Server;

    constructor(
        private readonly chatService: ChatService,
        @Inject(forwardRef(() => TelegramService))
        private readonly telegramService: TelegramService,
        @InjectRepository(CarregamentoEntity)
        private readonly carregamentoRepository: Repository<CarregamentoEntity>,
    ) {}

    @SubscribeMessage('join_carregamento')
    handleJoin(
        @MessageBody() carregamentoId: number,
        @ConnectedSocket() client: Socket,
    ) {
        const room = `carregamento_${carregamentoId}`;
        client.join(room);
        return { event: 'joined', room };
    }

    @SubscribeMessage('leave_carregamento')
    handleLeave(
        @MessageBody() carregamentoId: number,
        @ConnectedSocket() client: Socket,
    ) {
        const room = `carregamento_${carregamentoId}`;
        client.leave(room);
    }

    @SubscribeMessage('send_message')
    async handleSendMessage(
        @MessageBody() data: { carregamentoId: number; conteudo: string },
        @ConnectedSocket() _client: Socket,
    ) {
        const mensagem = await this.chatService.criarMensagem(
            data.carregamentoId,
            'usuario',
            data.conteudo,
        );

        // Emit to all in the room (including sender)
        this.server
            .to(`carregamento_${data.carregamentoId}`)
            .emit('new_message', mensagem);

        // Forward to driver's Telegram
        const carregamento = await this.carregamentoRepository.findOne({
            where: { id: data.carregamentoId },
            relations: ['motorista'],
        });
        if (carregamento?.motorista?.telegram_chat_id) {
            await this.telegramService.enviarMensagemParaMotorista(
                carregamento.motorista.telegram_chat_id,
                data.conteudo,
            );
        }

        return mensagem;
    }

    /**
     * Called by TelegramService when driver sends a message via Telegram
     */
    async emitMensagemMotorista(carregamentoId: number, conteudo: string) {
        const mensagem = await this.chatService.criarMensagem(
            carregamentoId,
            'motorista',
            conteudo,
        );

        this.server
            .to(`carregamento_${carregamentoId}`)
            .emit('new_message', mensagem);

        // Also broadcast a notification to all connected clients
        this.server.emit('notificacao', {
            tipo: 'nova_mensagem',
            carregamentoId,
            mensagem: conteudo,
        });

        return mensagem;
    }

    /**
     * Notify all connected clients of a carregamento status update
     */
    emitStatusUpdate(carregamentoId: number, status: string, motoristaName?: string) {
        this.server.emit('carregamento_status_update', {
            carregamentoId,
            status,
            motoristaName,
        });
    }

    /**
     * Notify about chat request from driver
     */
    emitChatRequest(carregamentoId: number, motoristaName: string) {
        this.server.emit('notificacao', {
            tipo: 'chat_solicitado',
            carregamentoId,
            motoristaName,
        });
    }
}
