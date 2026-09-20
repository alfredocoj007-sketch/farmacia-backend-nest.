import { IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString, Min } from 'class-validator';

export class CerrarSesionDto {
  @IsNumber()
  @IsPositive()
  @IsNotEmpty()
  sesionCajaId: number;

  @IsNumber()
  @Min(0, { message: 'El efectivo contado no puede ser negativo' })
  @IsNotEmpty({ message: 'Debe ingresar el efectivo contado físicamente en caja' })
  efectivoContado: number;

  @IsString()
  @IsOptional()
  observacionCierre?: string;
}
