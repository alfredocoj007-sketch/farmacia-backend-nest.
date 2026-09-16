import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Sucursal } from "./sucursal.entity";
import { SesionCaja } from "./sesion-caja.entity";

@Index("PK_CAJA", ["cajaId"], { unique: true })
@Index("UQ_CAJA_CODIGO", ["sucursalId", "codigoCaja"], { unique: true })
@Entity("CAJA")
export class Caja {
  @Column("number", { name: "SUCURSAL_ID", unique: true })
  sucursalId: number;

  @Column("varchar2", { name: "ESTADO", length: 20, default: () => "'ACTIVA'" })
  estado: string;

  @Column("varchar2", { name: "DESCRIPCION", nullable: true, length: 150 })
  descripcion: string | null;

  @Column("varchar2", { name: "CODIGO_CAJA", unique: true, length: 30 })
  codigoCaja: string;

  @PrimaryGeneratedColumn({ type: "number", name: "CAJA_ID" })
  cajaId: number;

  @ManyToOne(() => Sucursal, (sucursal) => sucursal.cajas)
  @JoinColumn([{ name: "SUCURSAL_ID", referencedColumnName: "sucursalId" }])
  sucursal: Sucursal;

  @OneToMany(() => SesionCaja, (sesionCaja) => sesionCaja.caja)
  sesionCajas: SesionCaja[];
}
