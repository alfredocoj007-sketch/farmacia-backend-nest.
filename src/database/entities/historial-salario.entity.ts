import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Empleado } from "./empleado.entity";

@Index("PK_HIST_SALARIO", ["historialSalarioId"], { unique: true })
@Entity("HISTORIAL_SALARIO")
export class HistorialSalario {
  @Column("number", { name: "SALARIO_NUEVO", precision: 18, scale: 2 })
  salarioNuevo: number;

  @Column("number", {
    name: "SALARIO_ANTERIOR",
    nullable: true,
    precision: 18,
    scale: 2,
  })
  salarioAnterior: number | null;

  @Column("varchar2", { name: "MOTIVO", nullable: true, length: 300 })
  motivo: string | null;

  @PrimaryGeneratedColumn({ type: "number", name: "HISTORIAL_SALARIO_ID" })
  historialSalarioId: number;

  @Column("date", { name: "FECHA_CAMBIO", default: () => "SYSDATE" })
  fechaCambio: Date;

  @ManyToOne(() => Empleado, (empleado) => empleado.historialSalarios)
  @JoinColumn([{ name: "EMPLEADO_ID", referencedColumnName: "empleadoId" }])
  empleado: Empleado;
}
