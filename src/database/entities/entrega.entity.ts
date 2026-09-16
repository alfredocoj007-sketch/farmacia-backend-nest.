import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Pedido } from "./pedido.entity";
import { Sucursal } from "./sucursal.entity";

@Index("PK_ENTREGA", ["entregaId"], { unique: true })
@Index("UQ_ENTREGA_PEDIDO", ["pedidoId"], { unique: true })
@Entity("ENTREGA")
export class Entrega {
  @Column("varchar2", { name: "PERSONA_RECIBE", nullable: true, length: 200 })
  personaRecibe: string | null;

  @Column("number", { name: "PEDIDO_ID", unique: true })
  pedidoId: number;

  @Column("varchar2", { name: "OBSERVACION", nullable: true, length: 500 })
  observacion: string | null;

  @Column("timestamp", { name: "FECHA_SALIDA", nullable: true, scale: 6 })
  fechaSalida: Date | null;

  @Column("timestamp", { name: "FECHA_PROGRAMADA", nullable: true, scale: 6 })
  fechaProgramada: Date | null;

  @Column("timestamp", { name: "FECHA_ENTREGA", nullable: true, scale: 6 })
  fechaEntrega: Date | null;

  @Column("varchar2", {
    name: "ESTADO",
    length: 25,
    default: () => "'PENDIENTE'",
  })
  estado: string;

  @PrimaryGeneratedColumn({ type: "number", name: "ENTREGA_ID" })
  entregaId: number;

  @OneToOne(() => Pedido, (pedido) => pedido.entrega)
  @JoinColumn([{ name: "PEDIDO_ID", referencedColumnName: "pedidoId" }])
  pedido: Pedido;

  @ManyToOne(() => Sucursal, (sucursal) => sucursal.entregas)
  @JoinColumn([{ name: "SUCURSAL_ID", referencedColumnName: "sucursalId" }])
  sucursal: Sucursal;
}
