import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Inventario } from "./inventario.entity";

@Index("PK_MOV_INV", ["movimientoInventarioId"], { unique: true })
@Entity("MOVIMIENTO_INVENTARIO")
export class MovimientoInventario {
  @Column("varchar2", { name: "TIPO_MOVIMIENTO", length: 30 })
  tipoMovimiento: string;

  @Column("varchar2", { name: "REFERENCIA_TIPO", nullable: true, length: 50 })
  referenciaTipo: string | null;

  @Column("number", { name: "REFERENCIA_ID", nullable: true })
  referenciaId: number | null;

  @Column("varchar2", { name: "OBSERVACION", nullable: true, length: 500 })
  observacion: string | null;

  @PrimaryGeneratedColumn({ type: "number", name: "MOVIMIENTO_INVENTARIO_ID" })
  movimientoInventarioId: number;

  @Column("timestamp", {
    name: "FECHA_MOVIMIENTO",
    scale: 6,
    default: () => "SYSTIMESTAMP",
  })
  fechaMovimiento: Date;

  @Column("number", { name: "CANTIDAD_NUEVA", precision: 18, scale: 3 })
  cantidadNueva: number;

  @Column("number", { name: "CANTIDAD_ANTERIOR", precision: 18, scale: 3 })
  cantidadAnterior: number;

  @Column("number", { name: "CANTIDAD", precision: 18, scale: 3 })
  cantidad: number;

  @ManyToOne(() => Inventario, (inventario) => inventario.movimientoInventarios)
  @JoinColumn([{ name: "INVENTARIO_ID", referencedColumnName: "inventarioId" }])
  inventario: Inventario;
}
