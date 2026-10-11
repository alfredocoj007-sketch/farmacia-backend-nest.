import { IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateDepartamentoDto {
  @IsNotEmpty({ message: 'El nombre del departamento es obligatorio.' })
  @IsString()
  @MinLength(3, { message: 'El nombre debe tener al menos 3 caracteres.' })
  @MaxLength(100, { message: 'El nombre no puede exceder 100 caracteres.' })
  nombre: string;

  @IsOptional()
  @IsString()
  @MinLength(3, { message: 'El nombre del municipio debe tener al menos 3 caracteres.' })
  @MaxLength(100, { message: 'El nombre del municipio no puede exceder 100 caracteres.' })
  municipioInicial?: string;
}
