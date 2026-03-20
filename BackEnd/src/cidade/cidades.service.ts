import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CidadeEntity } from './entities/cidade.entity';
import { CreateCidadeDto } from './dto/create-cidade.dto';
import { UpdateCidadeDto } from './dto/update-cidade.dto';

@Injectable()
export class CidadesService {
    constructor(
        @InjectRepository(CidadeEntity)
        private readonly cidadeRepository: Repository<CidadeEntity>,
    ) {}

    create(createCidadeDto: CreateCidadeDto) {
        const cidade = this.cidadeRepository.create(createCidadeDto);
        return this.cidadeRepository.save(cidade);
    }

    findAll() {
        return this.cidadeRepository.find();
    }

    findAllNomes() {
        return this.cidadeRepository.find({ select: ['id', 'nome'] });
    }

    async findOne(id: number) {
        const cidade = await this.cidadeRepository.findOneBy({ id });
        if (!cidade) {
            throw new NotFoundException(`Cidade #${id} não encontrada`);
        }
        return cidade;
    }

    async update(id: number, updateCidadeDto: UpdateCidadeDto) {
        const cidade = await this.cidadeRepository.preload({
            id,
            ...updateCidadeDto,
        });
        if (!cidade) {
            throw new NotFoundException(`Cidade #${id} não encontrada`);
        }
        return this.cidadeRepository.save(cidade);
    }

    async remove(id: number) {
        const cidade = await this.findOne(id);
        return this.cidadeRepository.remove(cidade);
    }
}
