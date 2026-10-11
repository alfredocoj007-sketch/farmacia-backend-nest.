import { IsNotEmpty, IsNumber, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateMunicipioDto {
  @IsNotEmpty({ message: 'El nombre del municipio es obligatorio.' })
  @IsString()
  @MinLength(3, { message: 'El nombre debe tener al menos 3 caracteres.' })
  @MaxLength(100, { message: 'El nombre no puede exceder 100 caracteres.' })
  nombre: string;

  @IsNotEmpty({ message: 'El departamento es obligatorio.' })
  @IsNumber({}, { message: 'El departamentoId debe ser un número válido.' })
  departamentoId: number;
}
