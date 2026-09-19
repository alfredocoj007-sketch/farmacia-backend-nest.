import { IsOptional, IsString } from 'class-validator';

export class PagarPlanillaDto {
  @IsOptional()
  @IsString({ message: 'La cuenta de origen debe ser texto' })
  cuentaOrigen?: string;

  @IsOptional()
  @IsString({ message: 'El método de pago debe ser texto' })
  metodoPago?: string;
}
