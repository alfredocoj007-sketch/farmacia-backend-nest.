import {
  IsArray,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CompraItemDto {
  @IsInt()
  productoId: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  numeroLote: string;

  @IsDateString()
  fechaVencimiento: string;

  @IsOptional()
  @IsDateString()
  fechaFabricacion?: string;

  @IsNumber()
  @Min(0)
  costoUnitario: number;

  @IsNumber()
  @Min(0.001)
  cantidad: number;
}

export class CreateCompraLoteDto {
  @IsOptional()
  @IsInt()
  proveedorId?: number;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  proveedorNombre?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  numeroFactura: string;

  @IsDateString()
  fechaFactura: string;

  @IsInt()
  sucursalId: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  observacion?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CompraItemDto)
  @ArrayMinSize(1)
  items: CompraItemDto[];
}
