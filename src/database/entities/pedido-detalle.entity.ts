import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Lote } from "./lote.entity";
import { Pedido } from "./pedido.entity";
import { Producto } from "./producto.entity";

@Index("PK_PEDIDO_DET", ["pedidoDetalleId"], { unique: true })
@Index("UQ_PEDIDO_DET", ["pedidoId", "productoId", "loteId"], { unique: true })
@Entity("PEDIDO_DETALLE")
export class PedidoDetalle {
  @Column("number", { name: "SUBTOTAL", precision: 18, scale: 2 })
  subtotal: number;

  @Column("number", { name: "PRODUCTO_ID", unique: true })
  productoId: number;

  @Column("number", { name: "PRECIO_UNITARIO", precision: 18, scale: 2 })
  precioUnitario: number;

  @Column("number", { name: "PEDIDO_ID", unique: true })
  pedidoId: number;

  @PrimaryGeneratedColumn({ type: "number", name: "PEDIDO_DETALLE_ID" })
  pedidoDetalleId: number;

  @Column("number", { name: "LOTE_ID", nullable: true, unique: true })
  loteId: number | null;

  @Column("number", { name: "CANTIDAD", precision: 18, scale: 3 })
  cantidad: number;

  @ManyToOne(() => Lote, (lote) => lote.pedidoDetalles)
  @JoinColumn([{ name: "LOTE_ID", referencedColumnName: "loteId" }])
  lote: Lote;

  @ManyToOne(() => Pedido, (pedido) => pedido.pedidoDetalles)
  @JoinColumn([{ name: "PEDIDO_ID", referencedColumnName: "pedidoId" }])
  pedido: Pedido;

  @ManyToOne(() => Producto, (producto) => producto.pedidoDetalles)
  @JoinColumn([{ name: "PRODUCTO_ID", referencedColumnName: "productoId" }])
  producto: Producto;
}
