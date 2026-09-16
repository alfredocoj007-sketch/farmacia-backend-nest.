import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateProductoDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  nombre: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  codigoProducto: string;

  @IsNumber()
  @Min(0)
  precioVenta: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  porcentajeIva?: number;

  @IsOptional()
  @IsBoolean()
  requiereReceta?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  principioActivo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  presentacion?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  concentracion?: string;

  @IsOptional()
  @IsInt()
  categoriaId?: number;

  @IsOptional()
  @IsInt()
  laboratorioId?: number;

  @IsOptional()
  @IsInt()
  unidadMedidaId?: number;
}
