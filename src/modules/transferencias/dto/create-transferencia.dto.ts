import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class CreateTransferenciaDetalleDto {
  @IsInt()
  loteId: number;

  @IsNumber()
  @Min(0.001)
  cantidadSolicitada: number;
}

export class CreateTransferenciaDto {
  @IsInt()
  sucursalOrigenId: number;

  @IsInt()
  sucursalDestinoId: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  observacion?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateTransferenciaDetalleDto)
  detalles: CreateTransferenciaDetalleDto[];
}
