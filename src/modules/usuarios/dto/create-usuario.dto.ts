import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateUsuarioDto {
  @IsNotEmpty({ message: 'El nombre de usuario es obligatorio.' })
  @IsString()
  @MinLength(3, { message: 'El nombre de usuario debe tener al menos 3 caracteres.' })
  @MaxLength(50, { message: 'El nombre de usuario no puede exceder 50 caracteres.' })
  username: string;

  @IsNotEmpty({ message: 'La contraseña es obligatoria.' })
  @IsString()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres.' })
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/,
    {
      message:
        'La contraseña debe tener al menos 8 caracteres e incluir mayúsculas (A-Z), minúsculas (a-z), números (0-9) y al menos un caracter especial (ej: !@#$%*).',
    },
  )
  password: string;

  @IsNotEmpty({ message: 'El nombre del empleado es obligatorio.' })
  @IsString()
  @MinLength(2, { message: 'El nombre debe tener al menos 2 caracteres.' })
  @MaxLength(100, { message: 'El nombre no puede exceder 100 caracteres.' })
  @Matches(/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]+$/, {
    message:
      'El nombre solo puede contener letras y espacios (no se permiten números ni símbolos).',
  })
  nombre: string;

  @IsNotEmpty({ message: 'El apellido del empleado es obligatorio.' })
  @IsString()
  @MinLength(2, { message: 'El apellido debe tener al menos 2 caracteres.' })
  @MaxLength(100, { message: 'El apellido no puede exceder 100 caracteres.' })
  @Matches(/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]+$/, {
    message:
      'El apellido solo puede contener letras y espacios (no se permiten números ni símbolos).',
  })
  apellido: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{8}$/, {
    message: 'El teléfono debe contener exactamente 8 dígitos numéricos.',
  })
  telefono?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{13}$/, {
    message: 'El DPI debe contener exactamente 13 dígitos numéricos.',
  })
  dpi?: string;

  @IsNotEmpty({ message: 'El rol es obligatorio.' })
  @IsNumber({}, { message: 'El rolId debe ser numérico.' })
  rolId: number;

  @IsNotEmpty({ message: 'La sucursal asignada es obligatoria.' })
  @IsNumber({}, { message: 'El sucursalId debe ser numérico.' })
  sucursalId: number;

  @IsOptional()
  @IsNumber({}, { message: 'El empleadoId debe ser numérico.' })
  empleadoId?: number;
}
