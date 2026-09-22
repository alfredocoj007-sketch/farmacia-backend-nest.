import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UpdateUsuarioDto {
  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'El nombre debe tener al menos 2 caracteres.' })
  @MaxLength(100, { message: 'El nombre no puede exceder 100 caracteres.' })
  @Matches(/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]+$/, {
    message:
      'El nombre solo puede contener letras y espacios (no se permiten números ni símbolos).',
  })
  nombre?: string;

  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'El apellido debe tener al menos 2 caracteres.' })
  @MaxLength(100, { message: 'El apellido no puede exceder 100 caracteres.' })
  @Matches(/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]+$/, {
    message:
      'El apellido solo puede contener letras y espacios (no se permiten números ni símbolos).',
  })
  apellido?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{8}$/, {
    message: 'El teléfono debe contener exactamente 8 dígitos numéricos.',
  })
  telefono?: string;

  @IsOptional()
  @IsNumber({}, { message: 'El rolId debe ser numérico.' })
  rolId?: number;

  @IsOptional()
  @IsNumber({}, { message: 'El sucursalId debe ser numérico.' })
  sucursalId?: number;

  @IsOptional()
  @IsString()
  @IsEnum(['ACTIVO', 'INACTIVO'], { message: 'El estado debe ser ACTIVO o INACTIVO.' })
  estado?: string;

  @IsOptional()
  @IsString()
  @MinLength(8, { message: 'La nueva contraseña debe tener al menos 8 caracteres.' })
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/,
    {
      message:
        'La nueva contraseña debe tener al menos 8 caracteres e incluir mayúsculas (A-Z), minúsculas (a-z), números (0-9) y un caracter especial (ej: !@#$%*).',
    },
  )
  password?: string;
}
