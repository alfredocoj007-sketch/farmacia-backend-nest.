import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Empleado } from "./empleado.entity";
import { MetodoPago } from "./metodo-pago.entity";
import { SesionCaja } from "./sesion-caja.entity";

@Index("PK_MOV_CAJA", ["movimientoCajaId"], { unique: true })
@Entity("MOVIMIENTO_CAJA")
export class MovimientoCaja {
  @Column("varchar2", { name: "TIPO_MOVIMIENTO", length: 20 })
  tipoMovimiento: string;

  @Column("varchar2", { name: "REFERENCIA_TIPO", nullable: true, length: 50 })
  referenciaTipo: string | null;

  @Column("number", { name: "REFERENCIA_ID", nullable: true })
  referenciaId: number | null;

  @PrimaryGeneratedColumn({ type: "number", name: "MOVIMIENTO_CAJA_ID" })
  movimientoCajaId: number;

  @Column("number", { name: "MONTO", precision: 18, scale: 2 })
  monto: number;

  @Column("timestamp", {
    name: "FECHA_MOVIMIENTO",
    scale: 6,
    default: () => "SYSTIMESTAMP",
  })
  fechaMovimiento: Date;

  @Column("varchar2", { name: "DESCRIPCION", nullable: true, length: 500 })
  descripcion: string | null;

  @ManyToOne(() => Empleado, (empleado) => empleado.movimientoCajas)
  @JoinColumn([{ name: "EMPLEADO_ID", referencedColumnName: "empleadoId" }])
  empleado: Empleado;

  @ManyToOne(() => MetodoPago, (metodoPago) => metodoPago.movimientoCajas)
  @JoinColumn([
    { name: "METODO_PAGO_ID", referencedColumnName: "metodoPagoId" },
  ])
  metodoPago: MetodoPago;

  @ManyToOne(() => SesionCaja, (sesionCaja) => sesionCaja.movimientoCajas)
  @JoinColumn([
    { name: "SESION_CAJA_ID", referencedColumnName: "sesionCajaId" },
  ])
  sesionCaja: SesionCaja;
}
