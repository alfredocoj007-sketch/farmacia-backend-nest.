import { IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString, Min } from 'class-validator';

export class AbrirSesionDto {
  @IsNumber()
  @IsPositive()
  @IsNotEmpty()
  cajaId: number;

  @IsNumber()
  @Min(0)
  @IsNotEmpty()
  saldoInicial: number;

  @IsString()
  @IsOptional()
  observacion?: string;
}
