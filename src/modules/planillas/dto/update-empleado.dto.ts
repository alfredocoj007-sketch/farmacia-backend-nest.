import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Matches,
} from 'class-validator';

export class UpdateEmpleadoDto {
  @IsOptional()
  @IsString({ message: 'El nombre debe ser texto' })
  @Length(2, 100, { message: 'El nombre debe tener entre 2 y 100 caracteres' })
  nombre?: string;

  @IsOptional()
  @IsString({ message: 'El apellido debe ser texto' })
  @Length(2, 100, { message: 'El apellido debe tener entre 2 y 100 caracteres' })
  apellido?: string;

  @IsOptional()
  @IsString({ message: 'El DPI debe ser texto' })
  @Matches(/^\d{13}$/, { message: 'El DPI debe tener exactamente 13 dígitos numéricos' })
  dpi?: string;

  @IsOptional()
  @IsString({ message: 'El teléfono debe ser texto' })
  @Matches(/^\d{8}$/, { message: 'El teléfono debe tener exactamente 8 dígitos numéricos' })
  telefono?: string;

  @IsOptional()
  @IsDateString({}, { message: 'La fecha de ingreso debe ser una fecha válida' })
  fechaIngreso?: string;

  @IsOptional()
  @IsEnum(['ACTIVO', 'INACTIVO', 'SUSPENDIDO'], {
    message: 'El estado debe ser ACTIVO, INACTIVO o SUSPENDIDO',
  })
  estado?: 'ACTIVO' | 'INACTIVO' | 'SUSPENDIDO';

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'El puesto laboral debe ser numérico' })
  puestoId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'La sucursal debe ser numérica' })
  sucursalId?: number;
}
