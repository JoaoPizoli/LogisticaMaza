import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CarregamentoModule } from './carregamento/carregamento.module';
import { CidadeModule } from './cidade/cidade.module';
import { PedidoModule } from './pedido/pedido.module';
import { UsuarioModule } from './usuario/usuario.module';
import { AuthModule } from './auth/auth.module';
import { RotaModule } from './rota/rota.module';
import { WorkersModule } from './workers/workers.module';
import { SeedModule } from './seed/seed.module';
import { MotoristaModule } from './motorista/motorista.module';
import { TelegramModule } from './telegram/telegram.module';
import { ChatModule } from './chat/chat.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('DB_HOST'),
        port: config.get<number>('DB_PORT'),
        username: config.get<string>('DB_USER'),
        password: config.get<string>('DB_PASS'),
        database: config.get<string>('DB_NAME'),
        autoLoadEntities: true,
        synchronize: true,
      }),
    }),
    ScheduleModule.forRoot(),
    CarregamentoModule,
    CidadeModule,
    PedidoModule,
    UsuarioModule,
    AuthModule,
    RotaModule,
    WorkersModule,
    SeedModule,
    MotoristaModule,
    TelegramModule,
    ChatModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
