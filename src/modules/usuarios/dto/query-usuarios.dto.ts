import { IsOptional, IsString } from 'class-validator';

export class QueryUsuariosDto {
  @IsOptional()
  @IsString()
  buscar?: string;

  @IsOptional()
  @IsString()
  rolId?: string;

  @IsOptional()
  @IsString()
  sucursalId?: string;

  @IsOptional()
  @IsString()
  estado?: string;
}
