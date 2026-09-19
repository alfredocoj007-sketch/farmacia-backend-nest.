import { Type } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsPositive, IsString, Length } from 'class-validator';

export class AjustarSalarioDto {
  @IsNotEmpty({ message: 'El nuevo salario es obligatorio' })
  @Type(() => Number)
  @IsNumber({}, { message: 'El salario debe ser numérico' })
  @IsPositive({ message: 'El nuevo salario debe ser mayor a 0' })
  nuevoSalario: number;

  @IsNotEmpty({ message: 'El motivo del ajuste salarial es obligatorio para auditoría' })
  @IsString({ message: 'El motivo debe ser texto' })
  @Length(5, 300, { message: 'El motivo debe tener entre 5 y 300 caracteres' })
  motivo: string;
}
