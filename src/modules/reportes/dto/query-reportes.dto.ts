import { IsOptional, IsString, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class QueryReportesDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  sucursalId?: number;

  @IsOptional()
  @IsString()
  periodo?: string; // 'HOY', 'SEMANA', 'MES', 'ANIO', 'HISTORICO', 'PERSONALIZADO'

  @IsOptional()
  @IsString()
  fechaInicio?: string;

  @IsOptional()
  @IsString()
  fechaFin?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limite?: number;
}
