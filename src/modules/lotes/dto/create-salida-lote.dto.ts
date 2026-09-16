import { IsIn, IsInt, IsNumber, IsOptional, IsString, Min, MaxLength } from 'class-validator';

export class CreateSalidaLoteDto {
  @IsInt()
  productoId: number;

  @IsInt()
  sucursalId: number;

  @IsNumber()
  @Min(0.001)
  cantidad: number;

  @IsIn(['VENTA', 'AJUSTE'])
  tipoMovimiento: 'VENTA' | 'AJUSTE';

  @IsOptional()
  @IsInt()
  loteId?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  observacion?: string;
}
