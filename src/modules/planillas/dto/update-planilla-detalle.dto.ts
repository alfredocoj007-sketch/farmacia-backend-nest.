import { IsNumber, IsOptional, Min } from 'class-validator';

export class UpdatePlanillaDetalleDto {
  @IsOptional()
  @IsNumber({}, { message: 'Las horas extras deben ser un valor numérico' })
  @Min(0, { message: 'Las horas extras no pueden ser negativas' })
  horasExtra?: number;

  @IsOptional()
  @IsNumber({}, { message: 'Las bonificaciones deben ser un valor numérico' })
  @Min(0, { message: 'Las bonificaciones no pueden ser negativas' })
  bonificaciones?: number;

  @IsOptional()
  @IsNumber({}, { message: 'Los descuentos adicionales deben ser un valor numérico' })
  @Min(0, { message: 'Los descuentos no pueden ser negativos' })
  descuentos?: number;
}
