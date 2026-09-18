import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class MantenimientoActivoDto {
  @IsNotEmpty({ message: 'El estado es requerido' })
  @IsIn(['ACTIVO', 'EN_MANTENIMIENTO', 'DE_BAJA'], {
    message: 'El estado debe ser ACTIVO, EN_MANTENIMIENTO o DE_BAJA',
  })
  estado: string;

  @IsOptional()
  @IsString()
  observacion?: string;
}
