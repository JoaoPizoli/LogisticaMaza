import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RotaEntity } from './entities/rota.entity';
import { CreateRotaDto } from './dto/create-rota.dto';
import { UpdateRotaDto } from './dto/update-rota.dto';

@Injectable()
export class RotaService {
    constructor(
        @InjectRepository(RotaEntity)
        private readonly rotaRepository: Repository<RotaEntity>,
    ) {}

    create(createRotaDto: CreateRotaDto) {
        const rota = this.rotaRepository.create(createRotaDto);
        return this.rotaRepository.save(rota);
    }

    findAll() {
        return this.rotaRepository.find();
    }

    async findOne(id: number) {
        const rota = await this.rotaRepository.findOneBy({ id });
        if (!rota) {
            throw new NotFoundException(`Rota #${id} não encontrada`);
        }
        return rota;
    }

    async update(id: number, updateRotaDto: UpdateRotaDto) {
        const rota = await this.rotaRepository.preload({
            id,
            ...updateRotaDto,
        });
        if (!rota) {
            throw new NotFoundException(`Rota #${id} não encontrada`);
        }
        return this.rotaRepository.save(rota);
    }

    async remove(id: number) {
        const rota = await this.findOne(id);
        return this.rotaRepository.remove(rota);
    }
}
