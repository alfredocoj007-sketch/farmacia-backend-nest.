import {
  Column,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Producto } from "./producto.entity";

@Index("PK_CATEGORIA_PRODUCTO", ["categoriaId"], { unique: true })
@Index("UQ_CATEGORIA_PRODUCTO", ["nombre"], { unique: true })
@Entity("CATEGORIA_PRODUCTO")
export class CategoriaProducto {
  @Column("varchar2", { name: "NOMBRE", unique: true, length: 100 })
  nombre: string;

  @Column("varchar2", { name: "DESCRIPCION", nullable: true, length: 300 })
  descripcion: string | null;

  @PrimaryGeneratedColumn({ type: "number", name: "CATEGORIA_ID" })
  categoriaId: number;

  @OneToMany(() => Producto, (producto) => producto.categoria)
  productos: Producto[];
}
