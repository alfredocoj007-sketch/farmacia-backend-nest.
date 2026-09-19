import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditoriaEvento } from '../../database/entities/auditoria-evento.entity';
import { Credencial } from '../../database/entities/credencial.entity';
import { Rol } from '../../database/entities/rol.entity';
import { AuthModule } from '../auth/auth.module';
import { AuditoriaService } from './auditoria.service';
import { AuditoriaController } from './auditoria.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([AuditoriaEvento, Credencial, Rol]),
    forwardRef(() => AuthModule),
  ],
  controllers: [AuditoriaController],
  providers: [AuditoriaService],
  exports: [AuditoriaService],
})
export class AuditoriaModule {}
