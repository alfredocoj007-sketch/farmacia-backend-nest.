import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Empleado } from "./empleado.entity";
import { Planilla } from "./planilla.entity";

@Index("PK_PLANILLA_DET", ["planillaDetalleId"], { unique: true })
@Index("UQ_PLANILLA_EMP", ["planillaId", "empleadoId"], { unique: true })
@Entity("PLANILLA_DETALLE")
export class PlanillaDetalle {
  @Column("number", { name: "TOTAL_PAGAR", precision: 18, scale: 2 })
  totalPagar: number;

  @Column("number", { name: "SALARIO_BASE", precision: 18, scale: 2 })
  salarioBase: number;

  @Column("number", { name: "PLANILLA_ID", unique: true })
  planillaId: number;

  @PrimaryGeneratedColumn({ type: "number", name: "PLANILLA_DETALLE_ID" })
  planillaDetalleId: number;

  @Column("number", {
    name: "HORAS_EXTRA",
    precision: 18,
    scale: 2,
    default: () => "0",
  })
  horasExtra: number;

  @Column("number", { name: "EMPLEADO_ID", unique: true })
  empleadoId: number;

  @Column("number", {
    name: "DESCUENTOS",
    precision: 18,
    scale: 2,
    default: () => "0",
  })
  descuentos: number;

  @Column("number", {
    name: "BONIFICACIONES",
    precision: 18,
    scale: 2,
    default: () => "0",
  })
  bonificaciones: number;

  @ManyToOne(() => Empleado, (empleado) => empleado.planillaDetalles)
  @JoinColumn([{ name: "EMPLEADO_ID", referencedColumnName: "empleadoId" }])
  empleado: Empleado;

  @ManyToOne(() => Planilla, (planilla) => planilla.planillaDetalles)
  @JoinColumn([{ name: "PLANILLA_ID", referencedColumnName: "planillaId" }])
  planilla: Planilla;
}
