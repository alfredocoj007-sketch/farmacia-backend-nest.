import { IsIn, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString } from 'class-validator';

export class RegistrarMovimientoDto {
  @IsNumber()
  @IsPositive()
  @IsNotEmpty()
  sesionCajaId: number;

  @IsIn(['INGRESO', 'EGRESO'], {
    message: 'tipoMovimiento debe ser INGRESO o EGRESO',
  })
  @IsNotEmpty()
  tipoMovimiento: 'INGRESO' | 'EGRESO';

  @IsNumber()
  @IsPositive({ message: 'El monto debe ser un valor positivo' })
  @IsNotEmpty()
  monto: number;

  @IsNumber()
  @IsPositive()
  @IsNotEmpty()
  metodoPagoId: number;

  @IsString()
  @IsNotEmpty({ message: 'La descripción o concepto del movimiento es obligatoria' })
  descripcion: string;

  @IsString()
  @IsOptional()
  referenciaTipo?: string;

  @IsNumber()
  @IsOptional()
  referenciaId?: number;
}
