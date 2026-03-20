import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthService } from './auth.service';
import { Request } from 'express';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(private readonly authService: AuthService) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: process.env.JWT_SECRET || 'logistica-secret-key',
            passReqToCallback: true,
        });
    }

    async validate(req: Request, payload: { sub: number; email: string }) {
        const token = ExtractJwt.fromAuthHeaderAsBearerToken()(req);
        if (token && await this.authService.isTokenBlacklisted(token)) {
            throw new UnauthorizedException('Token invalidado');
        }
        return { id: payload.sub, email: payload.email };
    }
}
