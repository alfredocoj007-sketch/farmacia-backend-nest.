import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class QueryMovimientosDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sucursalId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  productoId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  loteId?: number;

  @IsOptional()
  @IsString()
  tipoMovimiento?: string;

  @IsOptional()
  @IsString()
  busqueda?: string;

  @IsOptional()
  @IsString()
  fechaDesde?: string;

  @IsOptional()
  @IsString()
  fechaHasta?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 50;
}
