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
import { Credencial } from "./credencial.entity";
import { Puesto } from "./puesto.entity";
import { Sucursal } from "./sucursal.entity";
import { HistorialSalario } from "./historial-salario.entity";
import { MovimientoCaja } from "./movimiento-caja.entity";
import { PlanillaDetalle } from "./planilla-detalle.entity";
import { SesionCaja } from "./sesion-caja.entity";

@Index("PK_EMPLEADO", ["empleadoId"], { unique: true })
@Index("UQ_EMPLEADO_DPI", ["dpi"], { unique: true })
@Entity("EMPLEADO")
export class Empleado {
  @Column("varchar2", { name: "TELEFONO", nullable: true, length: 30 })
  telefono: string | null;

  @Column("number", { name: "SALARIO_ACTUAL", precision: 18, scale: 2 })
  salarioActual: number;

  @Column("varchar2", { name: "NOMBRE", length: 100 })
  nombre: string;

  @Column("date", { name: "FECHA_INGRESO" })
  fechaIngreso: Date;

  @Column("varchar2", { name: "ESTADO", length: 20, default: () => "'ACTIVO'" })
  estado: string;

  @PrimaryGeneratedColumn({ type: "number", name: "EMPLEADO_ID" })
  empleadoId: number;

  @Column("varchar2", { name: "DPI", nullable: true, unique: true, length: 30 })
  dpi: string | null;

  @Column("varchar2", { name: "APELLIDO", length: 100 })
  apellido: string;

  @OneToOne(() => Credencial, (credencial) => credencial.empleado)
  credencial: Credencial;

  @ManyToOne(() => Puesto, (puesto) => puesto.empleados)
  @JoinColumn([{ name: "PUESTO_ID", referencedColumnName: "puestoId" }])
  puesto: Puesto;

  @ManyToOne(() => Sucursal, (sucursal) => sucursal.empleados)
  @JoinColumn([{ name: "SUCURSAL_ID", referencedColumnName: "sucursalId" }])
  sucursal: Sucursal;

  @OneToMany(
    () => HistorialSalario,
    (historialSalario) => historialSalario.empleado
  )
  historialSalarios: HistorialSalario[];

  @OneToMany(() => MovimientoCaja, (movimientoCaja) => movimientoCaja.empleado)
  movimientoCajas: MovimientoCaja[];

  @OneToMany(
    () => PlanillaDetalle,
    (planillaDetalle) => planillaDetalle.empleado
  )
  planillaDetalles: PlanillaDetalle[];

  @OneToMany(() => SesionCaja, (sesionCaja) => sesionCaja.empleadoApertura)
  sesionCajas: SesionCaja[];

  @OneToMany(() => SesionCaja, (sesionCaja) => sesionCaja.empleadoCierre)
  sesionCajas2: SesionCaja[];
}
