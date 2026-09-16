import { IsDateString, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Min, MaxLength } from 'class-validator';

export class CreateEntradaLoteDto {
  @IsInt()
  productoId: number;

  @IsInt()
  sucursalId: number;

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

  @IsOptional()
  @IsString()
  @MaxLength(500)
  observacion?: string;
}
