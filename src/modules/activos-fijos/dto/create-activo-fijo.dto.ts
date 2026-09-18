import { IsDateString, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateActivoFijoDto {
  @IsNotEmpty({ message: 'El código del activo es requerido' })
  @IsString()
  codigoActivo: string;

  @IsNotEmpty({ message: 'La descripción del equipo o activo es requerida' })
  @IsString()
  descripcion: string;

  @IsNotEmpty({ message: 'La categoría del activo es requerida' })
  @IsNumber()
  categoriaActivoId: number;

  @IsNotEmpty({ message: 'La sucursal asignada es requerida' })
  @IsNumber()
  sucursalId: number;

  @IsOptional()
  @IsString()
  marca?: string;

  @IsOptional()
  @IsString()
  modelo?: string;

  @IsOptional()
  @IsString()
  numeroSerie?: string;

  @IsNotEmpty({ message: 'La fecha de adquisición es requerida' })
  @IsDateString({}, { message: 'La fecha de adquisición debe ser una fecha válida (YYYY-MM-DD)' })
  fechaAdquisicion: string;

  @IsNotEmpty({ message: 'El valor de adquisición es requerido' })
  @IsNumber({}, { message: 'El valor de adquisición debe ser numérico' })
  @Min(0, { message: 'El valor de adquisición no puede ser negativo' })
  valorAdquisicion: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  valorResidual?: number;
}
