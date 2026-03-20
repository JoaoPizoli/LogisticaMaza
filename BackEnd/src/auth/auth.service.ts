import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { UsuarioEntity } from '../usuario/entities/usuario.entity';
import { BlacklistTokenEntity } from './entities/blacklist-token.entity';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
    constructor(
        @InjectRepository(UsuarioEntity)
        private readonly usuarioRepository: Repository<UsuarioEntity>,
        @InjectRepository(BlacklistTokenEntity)
        private readonly blacklistRepository: Repository<BlacklistTokenEntity>,
        private readonly jwtService: JwtService,
    ) {}

    async login(loginDto: LoginDto) {
        const usuario = await this.usuarioRepository.findOneBy({ email: loginDto.email });
        if (!usuario) {
            throw new UnauthorizedException('Credenciais inválidas');
        }

        const senhaValida = await bcrypt.compare(loginDto.senha, usuario.senha);
        if (!senhaValida) {
            throw new UnauthorizedException('Credenciais inválidas');
        }

        const payload = { sub: usuario.id, email: usuario.email };
        const token = this.jwtService.sign(payload);

        return { access_token: token };
    }

    async logout(token: string) {
        const decoded = this.jwtService.decode(token) as { exp: number };
        const expiresAt = new Date(decoded.exp * 1000);

        const blacklistToken = this.blacklistRepository.create({ token, expiresAt });
        await this.blacklistRepository.save(blacklistToken);

        return { message: 'Logout realizado com sucesso' };
    }

    async isTokenBlacklisted(token: string): Promise<boolean> {
        const found = await this.blacklistRepository.findOneBy({ token });
        return !!found;
    }

    async cleanExpiredTokens() {
        await this.blacklistRepository.delete({ expiresAt: LessThan(new Date()) });
    }
}
