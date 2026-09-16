import { registerAs } from '@nestjs/config';

export interface JwtConfig {
  secret: string;
  expiresInSeconds: number;
}

export default registerAs(
  'jwt',
  (): JwtConfig => ({
    secret: process.env.JWT_SECRET ?? '',
    expiresInSeconds: parseInt(process.env.JWT_EXPIRES_IN_SECONDS ?? '28800', 10),
  }),
);