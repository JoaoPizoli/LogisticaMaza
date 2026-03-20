import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as mysql from 'mysql2/promise';

@Injectable()
export class ErpConnectionService implements OnModuleInit, OnModuleDestroy {
    private pool: mysql.Pool;
    private readonly logger = new Logger(ErpConnectionService.name);

    constructor(private readonly configService: ConfigService) {}

    async onModuleInit() {
        this.pool = mysql.createPool({
            host: this.configService.get<string>('ERP_DB_HOST'),
            port: this.configService.get<number>('ERP_DB_PORT'),
            user: this.configService.get<string>('ERP_DB_USER'),
            password: this.configService.get<string>('ERP_DB_PASSWORD'),
            database: this.configService.get<string>('ERP_DB_NAME'),
            waitForConnections: true,
            connectionLimit: 5,
            queueLimit: 0,
        });
        this.logger.log('Pool de conexão com o banco ERP criado');
    }

    async query<T = any>(sql: string, params?: any[]): Promise<T[]> {
        const [rows] = await this.pool.execute(sql, params);
        return rows as T[];
    }

    async onModuleDestroy() {
        await this.pool.end();
        this.logger.log('Pool de conexão com o banco ERP encerrado');
    }
}
