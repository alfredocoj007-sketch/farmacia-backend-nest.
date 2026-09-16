import {
  Column,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Producto } from "./producto.entity";

@Index("PK_LABORATORIO", ["laboratorioId"], { unique: true })
@Index("UQ_LABORATORIO_NOMBRE", ["nombre"], { unique: true })
@Entity("LABORATORIO")
export class Laboratorio {
  @Column("varchar2", { name: "TELEFONO", nullable: true, length: 30 })
  telefono: string | null;

  @Column("varchar2", { name: "NOMBRE", unique: true, length: 150 })
  nombre: string;

  @PrimaryGeneratedColumn({ type: "number", name: "LABORATORIO_ID" })
  laboratorioId: number;

  @OneToMany(() => Producto, (producto) => producto.laboratorio)
  productos: Producto[];
}
