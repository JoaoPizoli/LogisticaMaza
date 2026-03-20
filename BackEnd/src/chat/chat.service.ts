import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MensagemChatEntity } from './entities/mensagem-chat.entity';

@Injectable()
export class ChatService {
    constructor(
        @InjectRepository(MensagemChatEntity)
        private readonly mensagemRepository: Repository<MensagemChatEntity>,
    ) {}

    async criarMensagem(carregamentoId: number, remetente: string, conteudo: string) {
        const mensagem = this.mensagemRepository.create({
            carregamento_id: carregamentoId,
            remetente,
            conteudo,
        });
        return this.mensagemRepository.save(mensagem);
    }

    async buscarMensagens(carregamentoId: number) {
        return this.mensagemRepository.find({
            where: { carregamento_id: carregamentoId },
            order: { createdAt: 'ASC' },
        });
    }
}
