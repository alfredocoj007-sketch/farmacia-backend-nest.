import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateSucursalDto {
  @IsNotEmpty({ message: 'El nombre de la sucursal es obligatorio.' })
  @IsString()
  @MinLength(3, { message: 'El nombre debe tener al menos 3 caracteres.' })
  @MaxLength(150, { message: 'El nombre no puede exceder 150 caracteres.' })
  nombre: string;

  @IsNotEmpty({ message: 'El tipo de punto de venta es obligatorio.' })
  @IsString()
  @IsEnum(['FARMACIA', 'MALL_STAND', 'GAS_STAND', 'BODEGA_CENTRAL', 'BODEGA_MATRIZ', 'STAND'], {
    message: 'Tipo de sucursal no válido (FARMACIA, MALL_STAND, GAS_STAND, BODEGA_CENTRAL).',
  })
  tipoSucursal: string;

  @IsNotEmpty({ message: 'La dirección física es obligatoria.' })
  @IsString()
  @MinLength(5, { message: 'La dirección debe tener al menos 5 caracteres.' })
  @MaxLength(300, { message: 'La dirección no puede exceder 300 caracteres.' })
  direccion: string;

  @IsOptional()
  @IsString()
  @MaxLength(30, { message: 'El teléfono no puede exceder 30 caracteres.' })
  telefono?: string;

  @IsNotEmpty({ message: 'El municipio es obligatorio.' })
  @IsNumber({}, { message: 'El municipioId debe ser un número.' })
  municipioId: number;

  @IsOptional()
  @IsNumber({}, { message: 'La latitud debe ser numérica.' })
  latitud?: number;

  @IsOptional()
  @IsNumber({}, { message: 'La longitud debe ser numérica.' })
  longitud?: number;

  @IsOptional()
  @IsString()
  @IsEnum(['ACTIVA', 'INACTIVA', 'MANTENIMIENTO'], {
    message: 'El estado debe ser ACTIVA, INACTIVA o MANTENIMIENTO.',
  })
  estado?: string = 'ACTIVA';
}
