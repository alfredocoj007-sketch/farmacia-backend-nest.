import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Inventario } from "./inventario.entity";
import { Producto } from "./producto.entity";
import { PedidoDetalle } from "./pedido-detalle.entity";
import { TransferenciaDetalle } from "./transferencia-detalle.entity";

@Index("PK_LOTE", ["loteId"], { unique: true })
@Index("UQ_LOTE_PRODUCTO", ["productoId", "numeroLote"], { unique: true })
@Entity("LOTE")
export class Lote {
  @Column("number", { name: "PRODUCTO_ID", unique: true })
  productoId: number;

  @Column("varchar2", { name: "NUMERO_LOTE", unique: true, length: 80 })
  numeroLote: string;

  @PrimaryGeneratedColumn({ type: "number", name: "LOTE_ID" })
  loteId: number;

  @Column("date", { name: "FECHA_VENCIMIENTO" })
  fechaVencimiento: Date;

  @Column("date", { name: "FECHA_FABRICACION", nullable: true })
  fechaFabricacion: Date | null;

  @Column("number", { name: "COSTO_UNITARIO", precision: 18, scale: 2 })
  costoUnitario: number;

  @OneToMany(() => Inventario, (inventario) => inventario.lote)
  inventarios: Inventario[];

  @ManyToOne(() => Producto, (producto) => producto.lotes)
  @JoinColumn([{ name: "PRODUCTO_ID", referencedColumnName: "productoId" }])
  producto: Producto;

  @OneToMany(() => PedidoDetalle, (pedidoDetalle) => pedidoDetalle.lote)
  pedidoDetalles: PedidoDetalle[];

  @OneToMany(
    () => TransferenciaDetalle,
    (transferenciaDetalle) => transferenciaDetalle.lote
  )
  transferenciaDetalles: TransferenciaDetalle[];
}
