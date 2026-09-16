import { Logger, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'oracle',
        host: config.get<string>('DB_HOST', 'localhost'),
        port: Number(config.get<string>('DB_PORT', '1521')),
        username: config.get<string>('DB_USERNAME'),
        password: config.get<string>('DB_PASSWORD'),
        serviceName: config.get<string>('DB_SERVICE_NAME', 'XEPDB1'),
        entities: [__dirname + '/entities/*{.ts,.js}'],
        synchronize: false, 
        logging:
          config.get<string>('NODE_ENV') !== 'production'
            ? ['query', 'error']
            : ['error'],
        extra: {
          thickMode: false,
          poolMin: Number(config.get<string>('DB_POOL_MIN', '5')),
          poolMax: Number(config.get<string>('DB_POOL_MAX', '20')),
          poolIncrement: Number(config.get<string>('DB_POOL_INCREMENT', '1')),
          poolTimeout: 60,
        },
      }),
    }),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {
  private readonly logger = new Logger(DatabaseModule.name);

  constructor() {
    this.logger.log('DatabaseModule inicializado correctamente con Oracle XE');
  }
}
