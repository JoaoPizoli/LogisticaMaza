import { IsEmail, IsString } from 'class-validator';

export class CreateUsuarioDto {
    @IsEmail()
    email: string;

    @IsString()
    senha: string;
}
