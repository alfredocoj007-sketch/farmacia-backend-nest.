import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';

import { LoginDto } from './dto/login.dto';
import { Credencial } from '../../database/entities/credencial.entity';
import { AuditoriaEvento } from '../../database/entities/auditoria-evento.entity';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(Credencial)
    private readonly credencialRepo: Repository<Credencial>,

    @InjectRepository(AuditoriaEvento)
    private readonly auditoriaRepo: Repository<AuditoriaEvento>,

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
      await this.auditarIntentoFallido(dto.username, 'Usuario no encontrado');
      throw new UnauthorizedException(
        'Usuario o contraseña incorrectos.',
      );
    }

    if (credencial.estado !== 'ACTIVO') {
      await this.auditarIntentoFallido(dto.username, 'Usuario inactivo');
      throw new UnauthorizedException(
        'El usuario está inactivo.',
      );
    }

    const passwordValido = await bcrypt.compare(
      dto.password,
      credencial.passwordHash,
    );

    if (!passwordValido) {
      await this.auditarIntentoFallido(dto.username, 'Contraseña inválida');
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

      await this.auditoriaRepo.save(
        this.auditoriaRepo.create({
          modulo: 'AUTH',
          operacion: 'LOGIN',
          tablaAfectada: 'CREDENCIAL',
          registroId: credencial.credencialId,
          clientIdentifier: credencial.username,
          descripcion: `Inicio de sesión exitoso. Usuario: ${credencial.username} (Rol: ${credencial.rol?.nombre || 'SIN_ROL'}).`,
          usuarioBd: 'FARMACIA_APP',
          ipCliente: '127.0.0.1',
          host: 'farma-client',
          fechaEvento: new Date(),
        }),
      );
    } catch (error) {
      this.logger.error('No se pudo actualizar auditoría de login:', error);
    }

    const payload = {
      sub: credencial.credencialId,
      username: credencial.username,
      empleadoId: credencial.empleadoId,
      rolId: credencial.rol.rolId,
      rolNombre: credencial.rol.nombre,
      sucursalId: credencial.empleado?.sucursal?.sucursalId ?? null,
      sucursalNombre: credencial.empleado?.sucursal?.nombre ?? null,
    };

    return {
      accessToken: this.jwtService.sign(payload),

      usuario: {
        credencialId: credencial.credencialId,
        username: credencial.username,
        nombre: credencial.empleado
          ? `${credencial.empleado.nombre} ${credencial.empleado.apellido}`
          : credencial.username,
        rol: credencial.rol?.nombre ?? '',
        sucursalId: credencial.empleado?.sucursal?.sucursalId ?? null,
        sucursalNombre: credencial.empleado?.sucursal?.nombre ?? null,
      },
    };
  }

  private async auditarIntentoFallido(username: string, motivo: string) {
    try {
      await this.auditoriaRepo.save(
        this.auditoriaRepo.create({
          modulo: 'AUTH',
          operacion: 'LOGIN_FALLIDO',
          tablaAfectada: 'CREDENCIAL',
          clientIdentifier: username || 'DESCONOCIDO',
          descripcion: `Intento de acceso denegado para el usuario: ${username}. Causa: ${motivo}.`,
          usuarioBd: 'FARMACIA_APP',
          ipCliente: '127.0.0.1',
          host: 'farma-client',
          fechaEvento: new Date(),
        }),
      );
    } catch (e) {
      this.logger.error('Error al auditar intento de login fallido:', e);
    }
  }
}