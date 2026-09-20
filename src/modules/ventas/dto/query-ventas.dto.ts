import { IsOptional, IsString } from 'class-validator';

export class QueryVentasDto {
  @IsOptional()
  @IsString()
  sucursalId?: string;

  @IsOptional()
  @IsString()
  fechaInicio?: string;

  @IsOptional()
  @IsString()
  fechaFin?: string;

  @IsOptional()
  @IsString()
  busqueda?: string;

  @IsOptional()
  @IsString()
  limit?: string;
}
