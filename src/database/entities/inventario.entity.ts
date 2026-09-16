import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Lote } from "./lote.entity";
import { Sucursal } from "./sucursal.entity";
import { MovimientoInventario } from "./movimiento-inventario.entity";

@Index("PK_INVENTARIO", ["inventarioId"], { unique: true })
@Index("UQ_INVENTARIO", ["sucursalId", "loteId"], { unique: true })
@Entity("INVENTARIO")
export class Inventario {
  @Column("number", { name: "SUCURSAL_ID", unique: true })
  sucursalId: number;

  @Column("number", {
    name: "STOCK_MINIMO",
    precision: 18,
    scale: 3,
    default: () => "0",
  })
  stockMinimo: number;

  @Column("number", {
    name: "STOCK_MAXIMO",
    nullable: true,
    precision: 18,
    scale: 3,
  })
  stockMaximo: number | null;

  @Column("number", { name: "LOTE_ID", unique: true })
  loteId: number;

  @PrimaryGeneratedColumn({ type: "number", name: "INVENTARIO_ID" })
  inventarioId: number;

  @Column("timestamp", {
    name: "FECHA_ACTUALIZACION",
    scale: 6,
    default: () => "SYSTIMESTAMP",
  })
  fechaActualizacion: Date;

  @Column("number", {
    name: "CANTIDAD_RESERVADA",
    precision: 18,
    scale: 3,
    default: () => "0",
  })
  cantidadReservada: number;

  @Column("number", {
    name: "CANTIDAD_DISPONIBLE",
    precision: 18,
    scale: 3,
    default: () => "0",
  })
  cantidadDisponible: number;

  @ManyToOne(() => Lote, (lote) => lote.inventarios)
  @JoinColumn([{ name: "LOTE_ID", referencedColumnName: "loteId" }])
  lote: Lote;

  @ManyToOne(() => Sucursal, (sucursal) => sucursal.inventarios)
  @JoinColumn([{ name: "SUCURSAL_ID", referencedColumnName: "sucursalId" }])
  sucursal: Sucursal;

  @OneToMany(
    () => MovimientoInventario,
    (movimientoInventario) => movimientoInventario.inventario
  )
  movimientoInventarios: MovimientoInventario[];
}
