import { Module } from '@nestjs/common';
import { ConfigModule, ConfigType } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { Credencial } from '../../database/entities/credencial.entity';
import jwtConfig from '../../config/jwt.config';

@Module({
  imports: [
    TypeOrmModule.forFeature([Credencial]),
    PassportModule.register({ defaultStrategy: 'jwt' }),

    JwtModule.registerAsync({
      imports: [ConfigModule.forFeature(jwtConfig)], // Registras la config específica
      inject: [jwtConfig.KEY], // Inyectas la clave del namespace
      useFactory: (config: ConfigType<typeof jwtConfig>) => ({
        secret: config.secret, // Auto-completado y tipado 100% estricto
        signOptions: {
          expiresIn: config.expiresInSeconds,
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}
