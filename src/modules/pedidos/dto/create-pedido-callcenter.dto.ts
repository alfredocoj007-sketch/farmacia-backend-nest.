import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class ItemPedidoCallCenterDto {
  @IsNotEmpty({ message: 'El producto es requerido' })
  @IsInt()
  productoId: number;

  @IsNotEmpty({ message: 'La cantidad es requerida' })
  @IsNumber()
  @Min(1, { message: 'La cantidad mínima es 1' })
  cantidad: number;
}

export class NuevoClienteDto {
  @IsNotEmpty({ message: 'El nombre del cliente es requerido' })
  @IsString()
  nombre: string;

  @IsOptional()
  @IsString()
  apellido?: string;

  @IsNotEmpty({ message: 'El teléfono es requerido para contacto' })
  @IsString()
  telefono: string;

  @IsNotEmpty({ message: 'La dirección exacta de entrega es requerida' })
  @IsString()
  direccion: string;

  @IsOptional()
  @IsString()
  referenciaDireccion?: string;

  @IsOptional()
  @IsString()
  email?: string;
}

export class CreatePedidoCallCenterDto {
  @IsOptional()
  @IsInt()
  clienteId?: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => NuevoClienteDto)
  nuevoCliente?: NuevoClienteDto;

  @IsNotEmpty({ message: 'Debe seleccionar la farmacia que preparará y despachará la orden' })
  @IsInt()
  sucursalPreparacionId: number;

  @IsNotEmpty({ message: 'Debe seleccionar el método de pago' })
  @IsInt()
  metodoPagoId: number;

  @IsOptional()
  @IsString()
  origen?: string;

  @IsNotEmpty({ message: 'El tiempo o fecha estimada de entrega es requerido' })
  @IsDateString({}, { message: 'La fecha estimada debe ser una fecha válida' })
  fechaEstimadaEntrega: string;

  @IsOptional()
  @IsString()
  personaRecibe?: string;

  @IsOptional()
  @IsString()
  observacion?: string;

  @IsArray({ message: 'Debe agregar al menos un medicamento' })
  @ValidateNested({ each: true })
  @Type(() => ItemPedidoCallCenterDto)
  items: ItemPedidoCallCenterDto[];
}
