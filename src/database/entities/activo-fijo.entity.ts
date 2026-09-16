import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from "typeorm";
import { CategoriaActivo } from "./categoria-activo.entity";
import { Sucursal } from "./sucursal.entity";
import { HistorialActivo } from "./historial-activo.entity";

@Index("PK_ACTIVO", ["activoId"], { unique: true })
@Index("UQ_ACTIVO_CODIGO", ["codigoActivo"], { unique: true })
@Index("UQ_ACTIVO_SERIE", ["numeroSerie"], { unique: true })
@Entity("ACTIVO_FIJO")
export class ActivoFijo {
  @Column("number", {
    name: "VALOR_RESIDUAL",
    precision: 18,
    scale: 2,
    default: () => "0",
  })
  valorResidual: number;

  @Column("number", { name: "VALOR_LIBROS", precision: 18, scale: 2 })
  valorLibros: number;

  @Column("number", { name: "VALOR_ADQUISICION", precision: 18, scale: 2 })
  valorAdquisicion: number;

  @Column("varchar2", {
    name: "NUMERO_SERIE",
    nullable: true,
    unique: true,
    length: 100,
  })
  numeroSerie: string | null;

  @Column("varchar2", { name: "MODELO", nullable: true, length: 100 })
  modelo: string | null;

  @Column("varchar2", { name: "MARCA", nullable: true, length: 100 })
  marca: string | null;

  @Column("date", { name: "FECHA_ADQUISICION" })
  fechaAdquisicion: Date;

  @Column("varchar2", { name: "ESTADO", length: 25, default: () => "'ACTIVO'" })
  estado: string;

  @Column("varchar2", { name: "DESCRIPCION", length: 300 })
  descripcion: string;

  @Column("number", {
    name: "DEPRECIACION_ACUMULADA",
    precision: 18,
    scale: 2,
    default: () => "0",
  })
  depreciacionAcumulada: number;

  @Column("varchar2", { name: "CODIGO_ACTIVO", unique: true, length: 50 })
  codigoActivo: string;

  @PrimaryGeneratedColumn({ type: "number", name: "ACTIVO_ID" })
  activoId: number;

  @ManyToOne(
    () => CategoriaActivo,
    (categoriaActivo) => categoriaActivo.activoFijos
  )
  @JoinColumn([
    { name: "CATEGORIA_ACTIVO_ID", referencedColumnName: "categoriaActivoId" },
  ])
  categoriaActivo: CategoriaActivo;

  @ManyToOne(() => Sucursal, (sucursal) => sucursal.activoFijos)
  @JoinColumn([{ name: "SUCURSAL_ID", referencedColumnName: "sucursalId" }])
  sucursal: Sucursal;

  @OneToMany(() => HistorialActivo, (historialActivo) => historialActivo.activo)
  historialActivos: HistorialActivo[];
}
