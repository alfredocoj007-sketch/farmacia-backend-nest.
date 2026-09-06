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
        host: config.get<string>('DB_HOST'),
        port: parseInt(config.get<string>('DB_PORT', '1521'), 10),
        username: config.get<string>('DB_USERNAME'),
        password: config.get<string>('DB_PASSWORD'),
        serviceName: config.get<string>('DB_SERVICE_NAME'),
        extra: {
          poolMin: parseInt(config.get<string>('DB_POOL_MIN', '5'), 10),
          poolMax: parseInt(config.get<string>('DB_POOL_MAX', '20'), 10),
          poolIncrement: parseInt(config.get<string>('DB_POOL_INCREMENT', '1'), 10),
          poolTimeout: 60,
        },
        entities: [__dirname + '/../**/*.entity{.ts,.js}'],
        synchronize: false,
        logging: config.get<string>('NODE_ENV') !== 'production'? 
        ['query', 'error']  
        : ['error'],     
      }),
    }),
  ],
})
export class DatabaseModule {

     private readonly logger = new Logger(DatabaseModule.name);

  constructor() {
    this.logger.log('DatabaseModule inicializado');
  }
}
