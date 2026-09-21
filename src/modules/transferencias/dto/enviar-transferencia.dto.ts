import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class EnviarTransferenciaDetalleDto {
  @IsInt()
  loteId: number;

  @IsNumber()
  @Min(0.001)
  cantidadEnviada: number;
}

export class EnviarTransferenciaDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  observacion?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EnviarTransferenciaDetalleDto)
  detalles?: EnviarTransferenciaDetalleDto[];
}
