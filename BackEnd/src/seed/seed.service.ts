import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { UsuarioEntity } from '../usuario/entities/usuario.entity';
import { MotoristaEntity } from '../motorista/entities/motorista.entity';

@Injectable()
export class SeedService implements OnModuleInit {
    private readonly logger = new Logger(SeedService.name);

    constructor(
        @InjectRepository(UsuarioEntity)
        private readonly usuarioRepository: Repository<UsuarioEntity>,
        @InjectRepository(MotoristaEntity)
        private readonly motoristaRepository: Repository<MotoristaEntity>,
    ) {}

    async onModuleInit() {
        await this.seedAdmin();
        await this.seedMotoristas();
    }

    private async seedAdmin() {
        const email = 'ti@maza.com.br';
        const existing = await this.usuarioRepository.findOneBy({ email });

        if (existing) {
            this.logger.log('Usuário admin já existe, seed ignorado.');
            return;
        }

        const hashedSenha = await bcrypt.hash('@Maza2570', 10);
        const admin = this.usuarioRepository.create({
            email,
            senha: hashedSenha,
        });

        await this.usuarioRepository.save(admin);
        this.logger.log('Usuário admin criado com sucesso.');
    }

    private async seedMotoristas() {
        const count = await this.motoristaRepository.count();
        if (count > 0) {
            this.logger.log('Motoristas já existem, seed ignorado.');
            return;
        }

        const motoristas = [
            { nome: 'João Silva', telefone: '(11) 99999-0001' },
            { nome: 'Carlos Santos', telefone: '(11) 99999-0002' },
            { nome: 'Pedro Oliveira', telefone: '(11) 99999-0003' },
        ];

        for (const m of motoristas) {
            const motorista = this.motoristaRepository.create({
                ...m,
                codigo_vinculacao: uuidv4().slice(0, 8).toUpperCase(),
            });
            await this.motoristaRepository.save(motorista);
        }

        this.logger.log(`${motoristas.length} motorista(s) criado(s) com sucesso.`);
    }
}
