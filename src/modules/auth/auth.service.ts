import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';

import { LoginDto } from './dto/login.dto';
import { Credencial } from '../../database/entities/credencial.entity';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(Credencial)
    private readonly credencialRepo: Repository<Credencial>,

    private readonly jwtService: JwtService,
  ) {}

  async login(dto: LoginDto) {
    const credencial = await this.credencialRepo
      .createQueryBuilder('credencial')
      .addSelect('credencial.passwordHash')
      .leftJoinAndSelect('credencial.empleado', 'empleado')
      .leftJoinAndSelect('credencial.rol', 'rol')
      .leftJoinAndSelect('empleado.sucursal', 'sucursal')
      .where('credencial.username = :username', {
        username: dto.username,
      })
      .getOne();

    if (!credencial) {
      throw new UnauthorizedException(
        'Usuario o contraseña incorrectos.',
      );
    }

    if (credencial.estado !== 'ACTIVO') {
      throw new UnauthorizedException(
        'El usuario está inactivo.',
      );
    }

    const passwordValido = await bcrypt.compare(
      dto.password,
      credencial.passwordHash,
    );

    if (!passwordValido) {
      throw new UnauthorizedException(
        'Usuario o contraseña incorrectos.',
      );
    }

    try {
      await this.credencialRepo.update(
        {
          credencialId: credencial.credencialId,
        },
        {
          ultimoLogin: new Date(),
        },
      );
    } catch (error) {
      this.logger.error('No se pudo actualizar ultimoLogin:', error);
    }

    const payload = {
      sub: credencial.credencialId,
      username: credencial.username,
      empleadoId: credencial.empleadoId,
      rolId: credencial.rol.rolId,
      rolNombre: credencial.rol.nombre,
    };

    return {
      accessToken: this.jwtService.sign(payload),

      usuario: {
        credencialId: credencial.credencialId,
        username: credencial.username,
        nombre: `${credencial.empleado.nombre} ${credencial.empleado.apellido}`,
        rol: credencial.rol.nombre,
        sucursalId: credencial.empleado.sucursal.sucursalId,
      },
    };
  }
}