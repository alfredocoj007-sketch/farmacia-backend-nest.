import {
  Column,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Credencial } from "./credencial.entity";

@Index("PK_ROL", ["rolId"], { unique: true })
@Index("UQ_ROL_NOMBRE", ["nombre"], { unique: true })
@Entity("ROL")
export class Rol {
  @PrimaryGeneratedColumn({ type: "number", name: "ROL_ID" })
  rolId: number;

  @Column("varchar2", { name: "NOMBRE", unique: true, length: 50 })
  nombre: string;

  @Column("varchar2", { name: "ESTADO", length: 20, default: () => "'ACTIVO'" })
  estado: string;

  @Column("varchar2", { name: "DESCRIPCION", nullable: true, length: 200 })
  descripcion: string | null;

  @OneToMany(() => Credencial, (credencial) => credencial.rol)
  credencials: Credencial[];
}
