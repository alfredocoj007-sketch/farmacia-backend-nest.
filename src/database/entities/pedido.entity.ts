import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Entrega } from "./entrega.entity";
import { Cliente } from "./cliente.entity";
import { MetodoPago } from "./metodo-pago.entity";
import { Sucursal } from "./sucursal.entity";
import { PedidoDetalle } from "./pedido-detalle.entity";

@Index("PK_PEDIDO", ["pedidoId"], { unique: true })
@Entity("PEDIDO")
export class Pedido {
  @Column("number", {
    name: "TOTAL",
    precision: 18,
    scale: 2,
    default: () => "0",
  })
  total: number;

  @PrimaryGeneratedColumn({ type: "number", name: "PEDIDO_ID" })
  pedidoId: number;

  @Column("varchar2", { name: "ORIGEN", length: 20 })
  origen: string;

  @Column("varchar2", { name: "OBSERVACION", nullable: true, length: 500 })
  observacion: string | null;

  @Column("timestamp", {
    name: "FECHA_PEDIDO",
    scale: 6,
    default: () => "SYSTIMESTAMP",
  })
  fechaPedido: Date;

  @Column("timestamp", {
    name: "FECHA_ESTIMADA_ENTREGA",
    nullable: true,
    scale: 6,
  })
  fechaEstimadaEntrega: Date | null;

  @Column("timestamp", { name: "FECHA_CONFIRMACION", nullable: true, scale: 6 })
  fechaConfirmacion: Date | null;

  @Column("varchar2", {
    name: "ESTADO",
    length: 30,
    default: () => "'RECIBIDO'",
  })
  estado: string;

  @OneToOne(() => Entrega, (entrega) => entrega.pedido)
  entrega: Entrega;

  @ManyToOne(() => Cliente, (cliente) => cliente.pedidos)
  @JoinColumn([{ name: "CLIENTE_ID", referencedColumnName: "clienteId" }])
  cliente: Cliente;

  @ManyToOne(() => MetodoPago, (metodoPago) => metodoPago.pedidos)
  @JoinColumn([
    { name: "METODO_PAGO_ID", referencedColumnName: "metodoPagoId" },
  ])
  metodoPago: MetodoPago;

  @ManyToOne(() => Sucursal, (sucursal) => sucursal.pedidos)
  @JoinColumn([
    { name: "SUCURSAL_PREPARACION_ID", referencedColumnName: "sucursalId" },
  ])
  sucursalPreparacion: Sucursal;

  @OneToMany(() => PedidoDetalle, (pedidoDetalle) => pedidoDetalle.pedido)
  pedidoDetalles: PedidoDetalle[];
}
