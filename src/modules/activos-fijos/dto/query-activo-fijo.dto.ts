import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString } from 'class-validator';

export class QueryActivoFijoDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  sucursalId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  categoriaActivoId?: number;

  @IsOptional()
  @IsString()
  estado?: string;

  @IsOptional()
  @IsString()
  busqueda?: string;
}
