import { IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString } from 'class-validator';

export class CreateCajaDto {
  @IsNumber()
  @IsPositive()
  @IsNotEmpty()
  sucursalId: number;

  @IsString()
  @IsNotEmpty()
  codigoCaja: string;

  @IsString()
  @IsOptional()
  descripcion?: string;
}
