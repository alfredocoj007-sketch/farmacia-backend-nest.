import {
  Column,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
} from "typeorm";
import { ActivoFijo } from "./activo-fijo.entity";

@Index("PK_CATEGORIA_ACTIVO", ["categoriaActivoId"], { unique: true })
@Index("UQ_CATEGORIA_ACTIVO_NOMBRE", ["nombre"], { unique: true })
@Entity("CATEGORIA_ACTIVO")
export class CategoriaActivo {
  @Column("number", { name: "VIDA_UTIL_MESES" })
  vidaUtilMeses: number;

  @Column("varchar2", { name: "NOMBRE", unique: true, length: 100 })
  nombre: string;

  @Column("varchar2", { name: "ESTADO", length: 20, default: () => "'ACTIVO'" })
  estado: string;

  @PrimaryGeneratedColumn({ type: "number", name: "CATEGORIA_ACTIVO_ID" })
  categoriaActivoId: number;

  @OneToMany(() => ActivoFijo, (activoFijo) => activoFijo.categoriaActivo)
  activoFijos: ActivoFijo[];
}
