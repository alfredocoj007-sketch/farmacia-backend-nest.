import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CambiarEstadoPedidoDto {
  @IsNotEmpty({ message: 'El estado es requerido' })
  @IsIn(['RECIBIDO', 'EN_PREPARACION', 'EN_RUTA', 'ENTREGADO', 'CANCELADO'], {
    message: 'Estado inválido. Valores permitidos: RECIBIDO, EN_PREPARACION, EN_RUTA, ENTREGADO, CANCELADO',
  })
  estado: string;

  @IsOptional()
  @IsString()
  personaRecibe?: string;

  @IsOptional()
  @IsString()
  observacion?: string;
}
