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

export class RecibirTransferenciaDetalleDto {
  @IsInt()
  loteId: number;

  @IsNumber()
  @Min(0)
  cantidadRecibida: number;
}

export class RecibirTransferenciaDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  observacion?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RecibirTransferenciaDetalleDto)
  detalles?: RecibirTransferenciaDetalleDto[];
}
