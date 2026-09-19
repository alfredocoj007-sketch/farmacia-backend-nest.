import { IsDateString, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreatePlanillaDto {
  @IsNotEmpty({ message: 'La fecha de inicio del período es obligatoria' })
  @IsDateString({}, { message: 'La fecha de inicio debe ser una fecha válida (YYYY-MM-DD)' })
  fechaInicio: string;

  @IsNotEmpty({ message: 'La fecha de fin del período es obligatoria' })
  @IsDateString({}, { message: 'La fecha de fin debe ser una fecha válida (YYYY-MM-DD)' })
  fechaFin: string;

  @IsOptional()
  @IsString({ message: 'La descripción u observación debe ser texto' })
  observacion?: string;
}
