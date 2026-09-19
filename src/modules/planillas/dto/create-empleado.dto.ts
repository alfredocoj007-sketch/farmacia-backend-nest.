import { Type } from 'class-transformer';
import {
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Length,
  Matches,
} from 'class-validator';

export class CreateEmpleadoDto {
  @IsNotEmpty({ message: 'El nombre del empleado es obligatorio' })
  @IsString({ message: 'El nombre debe ser texto' })
  @Length(2, 100, { message: 'El nombre debe tener entre 2 y 100 caracteres' })
  nombre: string;

  @IsNotEmpty({ message: 'El apellido del empleado es obligatorio' })
  @IsString({ message: 'El apellido debe ser texto' })
  @Length(2, 100, { message: 'El apellido debe tener entre 2 y 100 caracteres' })
  apellido: string;

  @IsOptional()
  @IsString({ message: 'El DPI debe ser texto' })
  @Matches(/^\d{13}$/, { message: 'El DPI debe tener exactamente 13 dígitos numéricos' })
  dpi?: string;

  @IsOptional()
  @IsString({ message: 'El teléfono debe ser texto' })
  @Matches(/^\d{8}$/, { message: 'El teléfono debe tener exactamente 8 dígitos numéricos' })
  telefono?: string;

  @IsNotEmpty({ message: 'La fecha de ingreso es obligatoria' })
  @IsDateString({}, { message: 'La fecha de ingreso debe ser una fecha válida (YYYY-MM-DD)' })
  fechaIngreso: string;

  @IsNotEmpty({ message: 'El salario base inicial es obligatorio' })
  @Type(() => Number)
  @IsNumber({}, { message: 'El salario debe ser un valor numérico' })
  @IsPositive({ message: 'El salario debe ser mayor a 0' })
  salarioActual: number;

  @IsNotEmpty({ message: 'El puesto laboral es obligatorio' })
  @Type(() => Number)
  @IsNumber({}, { message: 'El puesto laboral debe ser válido' })
  puestoId: number;

  @IsNotEmpty({ message: 'La sucursal de asignación es obligatoria' })
  @Type(() => Number)
  @IsNumber({}, { message: 'La sucursal de asignación debe ser válida' })
  sucursalId: number;
}
