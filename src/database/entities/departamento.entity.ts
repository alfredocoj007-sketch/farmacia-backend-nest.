import {
  Column,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Municipio } from "./municipio.entity";

@Index("PK_DEPARTAMENTO", ["departamentoId"], { unique: true })
@Index("UQ_DEPARTAMENTO_NOMBRE", ["nombre"], { unique: true })
@Entity("DEPARTAMENTO")
export class Departamento {
  @Column("varchar2", { name: "NOMBRE", unique: true, length: 100 })
  nombre: string;

  @PrimaryGeneratedColumn({ type: "number", name: "DEPARTAMENTO_ID" })
  departamentoId: number;

  @OneToMany(() => Municipio, (municipio) => municipio.departamento)
  municipios: Municipio[];
}
