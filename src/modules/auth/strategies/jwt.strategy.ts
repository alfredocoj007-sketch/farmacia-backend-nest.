import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

export interface JwtPayload {
  sub: number;
  username: string;
  empleadoId: number;
  rolId: number;
  rolNombre: string;
}

export interface AuthenticatedUser {
  credencialId: number;
  username: string;
  empleadoId: number;
  rolId: number;
  rolNombre: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    const secret = config.get<string>('JWT_SECRET');

    if (!secret) {
      throw new Error('JWT_SECRET no está configurado');
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    return {
      credencialId: payload.sub,
      username: payload.username,
      empleadoId: payload.empleadoId,
      rolId: payload.rolId,
      rolNombre: payload.rolNombre,
    };
  }
}