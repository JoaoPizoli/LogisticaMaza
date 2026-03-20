import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { MotoristaEntity } from './entities/motorista.entity';
import { CreateMotoristaDto } from './dto/create-motorista.dto';
import { UpdateMotoristaDto } from './dto/update-motorista.dto';

@Injectable()
export class MotoristaService {
    constructor(
        @InjectRepository(MotoristaEntity)
        private readonly motoristaRepository: Repository<MotoristaEntity>,
    ) {}

    async create(createMotoristaDto: CreateMotoristaDto) {
        const motorista = this.motoristaRepository.create({
            ...createMotoristaDto,
            codigo_vinculacao: uuidv4().slice(0, 8).toUpperCase(),
        });
        return this.motoristaRepository.save(motorista);
    }

    findAll() {
        return this.motoristaRepository.find({ order: { nome: 'ASC' } });
    }

    async findOne(id: number) {
        const motorista = await this.motoristaRepository.findOneBy({ id });
        if (!motorista) {
            throw new NotFoundException(`Motorista #${id} não encontrado`);
        }
        return motorista;
    }

    async update(id: number, updateMotoristaDto: UpdateMotoristaDto) {
        const motorista = await this.motoristaRepository.preload({
            id,
            ...updateMotoristaDto,
        });
        if (!motorista) {
            throw new NotFoundException(`Motorista #${id} não encontrado`);
        }
        return this.motoristaRepository.save(motorista);
    }

    async remove(id: number) {
        const motorista = await this.findOne(id);
        return this.motoristaRepository.remove(motorista);
    }

    async vincularTelegram(codigo: string, chatId: string): Promise<MotoristaEntity | null> {
        const motorista = await this.motoristaRepository.findOneBy({ codigo_vinculacao: codigo.toUpperCase() });
        if (!motorista) return null;
        motorista.telegram_chat_id = chatId;
        return this.motoristaRepository.save(motorista);
    }

    async findByChatId(chatId: string): Promise<MotoristaEntity | null> {
        return this.motoristaRepository.findOneBy({ telegram_chat_id: chatId });
    }
}
