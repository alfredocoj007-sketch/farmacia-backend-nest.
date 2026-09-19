import { IsOptional, IsString, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class QueryAuditoriaDto {
  @IsOptional()
  @IsString()
  modulo?: string;

  @IsOptional()
  @IsString()
  operacion?: string;

  @IsOptional()
  @IsString()
  tablaAfectada?: string;

  @IsOptional()
  @IsString()
  usuarioBd?: string;

  @IsOptional()
  @IsString()
  clientIdentifier?: string;

  @IsOptional()
  @IsString()
  ipCliente?: string;

  @IsOptional()
  @IsString()
  fechaInicio?: string;

  @IsOptional()
  @IsString()
  fechaFin?: string;

  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: number = 50;
}
