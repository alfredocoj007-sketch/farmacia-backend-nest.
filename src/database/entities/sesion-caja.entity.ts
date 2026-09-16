import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from "typeorm";
import { MovimientoCaja } from "./movimiento-caja.entity";
import { Caja } from "./caja.entity";
import { Empleado } from "./empleado.entity";

@Index("PK_SESION_CAJA", ["sesionCajaId"], { unique: true })
@Entity("SESION_CAJA")
export class SesionCaja {
  @Column("number", {
    name: "TOTAL_INGRESOS",
    precision: 18,
    scale: 2,
    default: () => "0",
  })
  totalIngresos: number;

  @Column("number", {
    name: "TOTAL_EGRESOS",
    precision: 18,
    scale: 2,
    default: () => "0",
  })
  totalEgresos: number;

  @PrimaryGeneratedColumn({ type: "number", name: "SESION_CAJA_ID" })
  sesionCajaId: number;

  @Column("number", {
    name: "SALDO_INICIAL",
    precision: 18,
    scale: 2,
    default: () => "0",
  })
  saldoInicial: number;

  @Column("varchar2", {
    name: "OBSERVACION_CIERRE",
    nullable: true,
    length: 500,
  })
  observacionCierre: string | null;

  @Column("timestamp", { name: "FECHA_CIERRE", nullable: true, scale: 6 })
  fechaCierre: Date | null;

  @Column("timestamp", {
    name: "FECHA_APERTURA",
    scale: 6,
    default: () => "SYSTIMESTAMP",
  })
  fechaApertura: Date;

  @Column("varchar2", {
    name: "ESTADO",
    length: 20,
    default: () => "'ABIERTA'",
  })
  estado: string;

  @Column("number", {
    name: "EFECTIVO_ESPERADO",
    nullable: true,
    precision: 18,
    scale: 2,
  })
  efectivoEsperado: number | null;

  @Column("number", {
    name: "EFECTIVO_CONTADO",
    nullable: true,
    precision: 18,
    scale: 2,
  })
  efectivoContado: number | null;

  @Column("number", {
    name: "DIFERENCIA",
    nullable: true,
    precision: 18,
    scale: 2,
  })
  diferencia: number | null;

  @OneToMany(
    () => MovimientoCaja,
    (movimientoCaja) => movimientoCaja.sesionCaja
  )
  movimientoCajas: MovimientoCaja[];

  @ManyToOne(() => Caja, (caja) => caja.sesionCajas)
  @JoinColumn([{ name: "CAJA_ID", referencedColumnName: "cajaId" }])
  caja: Caja;

  @ManyToOne(() => Empleado, (empleado) => empleado.sesionCajas)
  @JoinColumn([
    { name: "EMPLEADO_APERTURA_ID", referencedColumnName: "empleadoId" },
  ])
  empleadoApertura: Empleado;

  @ManyToOne(() => Empleado, (empleado) => empleado.sesionCajas2)
  @JoinColumn([
    { name: "EMPLEADO_CIERRE_ID", referencedColumnName: "empleadoId" },
  ])
  empleadoCierre: Empleado;
}
