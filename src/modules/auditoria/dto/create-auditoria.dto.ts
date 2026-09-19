import { IsNotEmpty, IsOptional, IsString, IsNumber } from 'class-validator';

export class CreateAuditoriaDto {
  @IsNotEmpty({ message: 'La operación es obligatoria.' })
  @IsString()
  operacion: string;

  @IsNotEmpty({ message: 'La tabla afectada es obligatoria.' })
  @IsString()
  tablaAfectada: string;

  @IsOptional()
  @IsString()
  modulo?: string;

  @IsOptional()
  @IsNumber()
  registroId?: number;

  @IsOptional()
  @IsString()
  descripcion?: string;

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
  host?: string;
}
