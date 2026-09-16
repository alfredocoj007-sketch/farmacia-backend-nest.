import {
  Column,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
} from "typeorm";
import { MovimientoCaja } from "./movimiento-caja.entity";
import { Pedido } from "./pedido.entity";

@Index("PK_METODO_PAGO", ["metodoPagoId"], { unique: true })
@Index("UQ_METODO_PAGO", ["nombre"], { unique: true })
@Entity("METODO_PAGO")
export class MetodoPago {
  @Column("varchar2", { name: "NOMBRE", unique: true, length: 50 })
  nombre: string;

  @PrimaryGeneratedColumn({ type: "number", name: "METODO_PAGO_ID" })
  metodoPagoId: number;

  @Column("varchar2", { name: "ESTADO", length: 20, default: () => "'ACTIVO'" })
  estado: string;

  @OneToMany(
    () => MovimientoCaja,
    (movimientoCaja) => movimientoCaja.metodoPago
  )
  movimientoCajas: MovimientoCaja[];

  @OneToMany(() => Pedido, (pedido) => pedido.metodoPago)
  pedidos: Pedido[];
}
