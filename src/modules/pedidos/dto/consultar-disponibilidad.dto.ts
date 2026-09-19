import { Type } from 'class-transformer';
import { IsArray, IsInt, IsNotEmpty, IsNumber, Min, ValidateNested } from 'class-validator';

export class ItemConsultaDisponibilidadDto {
  @IsNotEmpty({ message: 'El ID del producto es requerido' })
  @IsInt()
  productoId: number;

  @IsNotEmpty({ message: 'La cantidad solicitada es requerida' })
  @IsNumber()
  @Min(1)
  cantidad: number;
}

export class ConsultarDisponibilidadDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ItemConsultaDisponibilidadDto)
  items: ItemConsultaDisponibilidadDto[];
}
