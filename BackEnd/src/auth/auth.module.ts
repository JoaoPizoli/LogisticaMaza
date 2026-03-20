import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsuarioEntity } from '../usuario/entities/usuario.entity';
import { BlacklistTokenEntity } from './entities/blacklist-token.entity';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';
import { JwtAuthGuard } from './jwt-auth.guard';

@Module({
    imports: [
        TypeOrmModule.forFeature([UsuarioEntity, BlacklistTokenEntity]),
        PassportModule,
        JwtModule.register({
            secret: process.env.JWT_SECRET || 'logistica-secret-key',
            signOptions: { expiresIn: '30d' },
        }),
    ],
    controllers: [AuthController],
    providers: [AuthService, JwtStrategy, JwtAuthGuard],
    exports: [AuthService, JwtAuthGuard],
})
export class AuthModule {}
