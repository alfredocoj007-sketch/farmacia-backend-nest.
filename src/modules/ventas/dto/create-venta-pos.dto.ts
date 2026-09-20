import {
  IsArray,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ItemVentaPosDto {
  @IsInt()
  @IsPositive()
  productoId: number;

  @IsOptional()
  @IsInt()
  @IsPositive()
  loteId?: number;

  @IsNumber()
  @IsPositive()
  cantidad: number;
}

export class ClienteVentaPosDto {
  @IsOptional()
  @IsString()
  nit?: string;

  @IsOptional()
  @IsString()
  nombre?: string;

  @IsOptional()
  @IsString()
  direccion?: string;

  @IsOptional()
  @IsString()
  telefono?: string;
}

export class CreateVentaPosDto {
  @IsInt()
  @IsPositive()
  sucursalId: number;

  @IsOptional()
  @IsInt()
  @IsPositive()
  cajaId?: number;

  @IsInt()
  @IsPositive()
  metodoPagoId: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  montoRecibido?: number;

  @IsOptional()
  @IsString()
  observacion?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => ClienteVentaPosDto)
  cliente?: ClienteVentaPosDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ItemVentaPosDto)
  items: ItemVentaPosDto[];
}
