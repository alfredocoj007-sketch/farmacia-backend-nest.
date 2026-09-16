import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Lote } from "./lote.entity";
import { PedidoDetalle } from "./pedido-detalle.entity";
import { CategoriaProducto } from "./categoria-producto.entity";
import { Laboratorio } from "./laboratorio.entity";
import { UnidadMedida } from "./unidad-medida.entity";

@Index("PK_PRODUCTO", ["productoId"], { unique: true })
@Index("UQ_PRODUCTO_CODIGO", ["codigoProducto"], { unique: true })
@Entity("PRODUCTO")
export class Producto {
  @Column("char", { name: "REQUIERE_RECETA", length: 1, default: () => "'N'" })
  requiereReceta: string;

  @PrimaryGeneratedColumn({ type: "number", name: "PRODUCTO_ID" })
  productoId: number;

  @Column("varchar2", { name: "PRINCIPIO_ACTIVO", nullable: true, length: 200 })
  principioActivo: string | null;

  @Column("varchar2", { name: "PRESENTACION", nullable: true, length: 100 })
  presentacion: string | null;

  @Column("number", { name: "PRECIO_VENTA", precision: 18, scale: 2 })
  precioVenta: number;

  @Column("number", {
    name: "PORCENTAJE_IVA",
    precision: 5,
    scale: 2,
    default: () => "12",
  })
  porcentajeIva: number;

  @Column("varchar2", { name: "NOMBRE", length: 200 })
  nombre: string;

  @Column("varchar2", { name: "ESTADO", length: 20, default: () => "'ACTIVO'" })
  estado: string;

  @Column("varchar2", { name: "CONCENTRACION", nullable: true, length: 100 })
  concentracion: string | null;

  @Column("varchar2", { name: "CODIGO_PRODUCTO", unique: true, length: 50 })
  codigoProducto: string;

  @OneToMany(() => Lote, (lote) => lote.producto)
  lotes: Lote[];

  @OneToMany(() => PedidoDetalle, (pedidoDetalle) => pedidoDetalle.producto)
  pedidoDetalles: PedidoDetalle[];

  @ManyToOne(
    () => CategoriaProducto,
    (categoriaProducto) => categoriaProducto.productos,
    { nullable: true }
  )
  @JoinColumn([{ name: "CATEGORIA_ID", referencedColumnName: "categoriaId" }])
  categoria: CategoriaProducto | null;

  @ManyToOne(() => Laboratorio, (laboratorio) => laboratorio.productos, { nullable: true })
  @JoinColumn([
    { name: "LABORATORIO_ID", referencedColumnName: "laboratorioId" },
  ])
  laboratorio: Laboratorio | null;

  @ManyToOne(() => UnidadMedida, (unidadMedida) => unidadMedida.productos, { nullable: true })
  @JoinColumn([
    { name: "UNIDAD_MEDIDA_ID", referencedColumnName: "unidadMedidaId" },
  ])
  unidadMedida: UnidadMedida | null;
}
