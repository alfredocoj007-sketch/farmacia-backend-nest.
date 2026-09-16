import {
  Column,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Producto } from "./producto.entity";

@Index("PK_UNIDAD_MEDIDA", ["unidadMedidaId"], { unique: true })
@Index("UQ_UNIDAD_MEDIDA_ABREV", ["abreviatura"], { unique: true })
@Index("UQ_UNIDAD_MEDIDA_NOMBRE", ["nombre"], { unique: true })
@Entity("UNIDAD_MEDIDA")
export class UnidadMedida {
  @PrimaryGeneratedColumn({ type: "number", name: "UNIDAD_MEDIDA_ID" })
  unidadMedidaId: number;

  @Column("varchar2", { name: "NOMBRE", unique: true, length: 50 })
  nombre: string;

  @Column("varchar2", { name: "ESTADO", length: 20, default: () => "'ACTIVO'" })
  estado: string;

  @Column("varchar2", { name: "ABREVIATURA", unique: true, length: 10 })
  abreviatura: string;

  @OneToMany(() => Producto, (producto) => producto.unidadMedida)
  productos: Producto[];
}
