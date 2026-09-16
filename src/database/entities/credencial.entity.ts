import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Empleado } from "./empleado.entity";
import { Rol } from "./rol.entity";

@Index("PK_CREDENCIAL", ["credencialId"], { unique: true })
@Index("UQ_CRED_EMPLEADO", ["empleadoId"], { unique: true })
@Index("UQ_CRED_USERNAME", ["username"], { unique: true })
@Entity("CREDENCIAL")
export class Credencial {
  @Column("varchar2", { name: "USERNAME", unique: true, length: 50 })
  username: string;

  @Column("timestamp", { name: "ULTIMO_LOGIN", nullable: true, scale: 6 })
  ultimoLogin: Date | null;

  @Column("varchar2", { name: "PASSWORD_HASH", length: 255, select: false })
  passwordHash: string;

  @Column("timestamp", {
    name: "FECHA_REGISTRO",
    scale: 6,
    default: () => "SYSTIMESTAMP",
  })
  fechaRegistro: Date;

  @Column("varchar2", { name: "ESTADO", length: 20, default: () => "'ACTIVO'" })
  estado: string;

  @Column("number", { name: "EMPLEADO_ID", unique: true })
  empleadoId: number;

  @PrimaryGeneratedColumn({ type: "number", name: "CREDENCIAL_ID" })
  credencialId: number;

  @OneToOne(() => Empleado, (empleado) => empleado.credencial)
  @JoinColumn([{ name: "EMPLEADO_ID", referencedColumnName: "empleadoId" }])
  empleado: Empleado;

  @ManyToOne(() => Rol, (rol) => rol.credencials)
  @JoinColumn([{ name: "ROL_ID", referencedColumnName: "rolId" }])
  rol: Rol;
}
