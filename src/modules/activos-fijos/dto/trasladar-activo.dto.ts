import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class TrasladarActivoDto {
  @IsNotEmpty({ message: 'La sucursal destino es requerida' })
  @IsNumber()
  sucursalDestinoId: number;

  @IsOptional()
  @IsString()
  observacion?: string;
}
