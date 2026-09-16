import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { ActivoFijo } from "./activo-fijo.entity";
import { Sucursal } from "./sucursal.entity";

@Index("PK_HIST_ACTIVO", ["historialActivoId"], { unique: true })
@Entity("HISTORIAL_ACTIVO")
export class HistorialActivo {
  @Column("number", {
    name: "VALOR_LIBROS",
    nullable: true,
    precision: 18,
    scale: 2,
  })
  valorLibros: number | null;

  @Column("varchar2", { name: "TIPO_MOVIMIENTO", length: 30 })
  tipoMovimiento: string;

  @Column("varchar2", { name: "OBSERVACION", nullable: true, length: 500 })
  observacion: string | null;

  @PrimaryGeneratedColumn({ type: "number", name: "HISTORIAL_ACTIVO_ID" })
  historialActivoId: number;

  @Column("timestamp", {
    name: "FECHA_MOVIMIENTO",
    scale: 6,
    default: () => "SYSTIMESTAMP",
  })
  fechaMovimiento: Date;

  @ManyToOne(() => ActivoFijo, (activoFijo) => activoFijo.historialActivos)
  @JoinColumn([{ name: "ACTIVO_ID", referencedColumnName: "activoId" }])
  activo: ActivoFijo;

  @ManyToOne(() => Sucursal, (sucursal) => sucursal.historialActivos)
  @JoinColumn([
    { name: "SUCURSAL_DESTINO_ID", referencedColumnName: "sucursalId" },
  ])
  sucursalDestino: Sucursal;

  @ManyToOne(() => Sucursal, (sucursal) => sucursal.historialActivos2)
  @JoinColumn([
    { name: "SUCURSAL_ORIGEN_ID", referencedColumnName: "sucursalId" },
  ])
  sucursalOrigen: Sucursal;
}
