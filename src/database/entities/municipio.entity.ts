import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Cliente } from "./cliente.entity";
import { Departamento } from "./departamento.entity";
import { Sucursal } from "./sucursal.entity";

@Index("PK_MUNICIPIO", ["municipioId"], { unique: true })
@Index("UQ_MUNICIPIO_NOMBRE", ["departamentoId", "nombre"], { unique: true })
@Entity("MUNICIPIO")
export class Municipio {
  @Column("varchar2", { name: "NOMBRE", unique: true, length: 100 })
  nombre: string;

  @PrimaryGeneratedColumn({ type: "number", name: "MUNICIPIO_ID" })
  municipioId: number;

  @Column("number", { name: "DEPARTAMENTO_ID", unique: true })
  departamentoId: number;

  @OneToMany(() => Cliente, (cliente) => cliente.municipio)
  clientes: Cliente[];

  @ManyToOne(() => Departamento, (departamento) => departamento.municipios)
  @JoinColumn([
    { name: "DEPARTAMENTO_ID", referencedColumnName: "departamentoId" },
  ])
  departamento: Departamento;

  @OneToMany(() => Sucursal, (sucursal) => sucursal.municipio)
  sucursals: Sucursal[];
}
