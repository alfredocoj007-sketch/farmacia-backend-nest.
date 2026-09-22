import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Credencial } from '../../database/entities/credencial.entity';
import { Empleado } from '../../database/entities/empleado.entity';
import { Rol } from '../../database/entities/rol.entity';
import { Sucursal } from '../../database/entities/sucursal.entity';
import { Puesto } from '../../database/entities/puesto.entity';
import { AuditoriaModule } from '../auditoria/auditoria.module';
import { AuthModule } from '../auth/auth.module';

import { UsuariosController } from './usuarios.controller';
import { UsuariosService } from './usuarios.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Credencial, Empleado, Rol, Sucursal, Puesto]),
    AuditoriaModule,
    AuthModule,
  ],
  controllers: [UsuariosController],
  providers: [UsuariosService],
  exports: [UsuariosService],
})
export class UsuariosModule {}
