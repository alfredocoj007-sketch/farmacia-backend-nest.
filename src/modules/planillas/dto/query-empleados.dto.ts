import { IsOptional, IsString } from 'class-validator';

export class QueryEmpleadosDto {
  @IsOptional()
  @IsString()
  busqueda?: string;

  @IsOptional()
  sucursalId?: number;

  @IsOptional()
  puestoId?: number;

  @IsOptional()
  @IsString()
  estado?: string;
}
