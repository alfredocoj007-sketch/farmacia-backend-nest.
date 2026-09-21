import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class QueryTransferenciasDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;

  @IsOptional()
  @IsString()
  estado?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sucursalOrigenId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sucursalDestinoId?: number;
}
