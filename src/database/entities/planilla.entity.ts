import {
  Column,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
} from "typeorm";
import { PlanillaDetalle } from "./planilla-detalle.entity";

@Index("PK_PLANILLA", ["planillaId"], { unique: true })
@Entity("PLANILLA")
export class Planilla {
  @Column("number", {
    name: "TOTAL_NETO",
    precision: 18,
    scale: 2,
    default: () => "0",
  })
  totalNeto: number;

  @Column("number", {
    name: "TOTAL_DESCUENTOS",
    precision: 18,
    scale: 2,
    default: () => "0",
  })
  totalDescuentos: number;

  @Column("number", {
    name: "TOTAL_BRUTO",
    precision: 18,
    scale: 2,
    default: () => "0",
  })
  totalBruto: number;

  @PrimaryGeneratedColumn({ type: "number", name: "PLANILLA_ID" })
  planillaId: number;

  @Column("date", { name: "FECHA_PAGO", nullable: true })
  fechaPago: Date | null;

  @Column("date", { name: "FECHA_INICIO" })
  fechaInicio: Date;

  @Column("date", { name: "FECHA_FIN" })
  fechaFin: Date;

  @Column("varchar2", {
    name: "ESTADO",
    length: 20,
    default: () => "'ABIERTA'",
  })
  estado: string;

  @OneToMany(
    () => PlanillaDetalle,
    (planillaDetalle) => planillaDetalle.planilla
  )
  planillaDetalles: PlanillaDetalle[];
}
