import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { UsuarioEntity } from './entities/usuario.entity';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';

@Injectable()
export class UsuarioService {
    constructor(
        @InjectRepository(UsuarioEntity)
        private readonly usuarioRepository: Repository<UsuarioEntity>,
    ) {}

    async create(createUsuarioDto: CreateUsuarioDto) {
        const hashedSenha = await bcrypt.hash(createUsuarioDto.senha, 10);
        const usuario = this.usuarioRepository.create({
            ...createUsuarioDto,
            senha: hashedSenha,
        });
        return this.usuarioRepository.save(usuario);
    }

    findAll() {
        return this.usuarioRepository.find();
    }

    async findOne(id: number) {
        const usuario = await this.usuarioRepository.findOneBy({ id });
        if (!usuario) {
            throw new NotFoundException(`Usuário #${id} não encontrado`);
        }
        return usuario;
    }

    async update(id: number, updateUsuarioDto: UpdateUsuarioDto) {
        if (updateUsuarioDto.senha) {
            updateUsuarioDto.senha = await bcrypt.hash(updateUsuarioDto.senha, 10);
        }
        const usuario = await this.usuarioRepository.preload({
            id,
            ...updateUsuarioDto,
        });
        if (!usuario) {
            throw new NotFoundException(`Usuário #${id} não encontrado`);
        }
        return this.usuarioRepository.save(usuario);
    }

    async remove(id: number) {
        const usuario = await this.findOne(id);
        return this.usuarioRepository.remove(usuario);
    }
}
