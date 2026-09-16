import {
  Column,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Empleado } from "./empleado.entity";

@Index("PK_PUESTO", ["puestoId"], { unique: true })
@Index("UQ_PUESTO_NOMBRE", ["nombre"], { unique: true })
@Entity("PUESTO")
export class Puesto {
  @PrimaryGeneratedColumn({ type: "number", name: "PUESTO_ID" })
  puestoId: number;

  @Column("varchar2", { name: "NOMBRE", unique: true, length: 100 })
  nombre: string;

  @Column("varchar2", { name: "ESTADO", length: 20, default: () => "'ACTIVO'" })
  estado: string;

  @Column("varchar2", { name: "DESCRIPCION", nullable: true, length: 300 })
  descripcion: string | null;

  @OneToMany(() => Empleado, (empleado) => empleado.puesto)
  empleados: Empleado[];
}
