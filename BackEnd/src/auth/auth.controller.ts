import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import type { Request } from 'express';

@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) {}

    @Post('login')
    login(@Body() loginDto: LoginDto) {
        return this.authService.login(loginDto);
    }

    @Post('logout')
    @UseGuards(JwtAuthGuard)
    logout(@Req() req: Request) {
        const token = req.headers.authorization?.replace('Bearer ', '');
        return this.authService.logout(token!);
    }
}
