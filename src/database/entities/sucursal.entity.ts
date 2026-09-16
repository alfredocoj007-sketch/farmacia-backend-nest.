import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from "typeorm";
import { ActivoFijo } from "./activo-fijo.entity";
import { Caja } from "./caja.entity";
import { Empleado } from "./empleado.entity";
import { Entrega } from "./entrega.entity";
import { HistorialActivo } from "./historial-activo.entity";
import { Inventario } from "./inventario.entity";
import { Pedido } from "./pedido.entity";
import { Municipio } from "./municipio.entity";
import { Transferencia } from "./transferencia.entity";

@Index("PK_SUCURSAL", ["sucursalId"], { unique: true })
@Index("UQ_SUCURSAL_NOMBRE", ["nombre"], { unique: true })
@Entity("SUCURSAL")
export class Sucursal {
  @Column("varchar2", {
    name: "TIPO_SUCURSAL",
    length: 20,
    default: () => "'FARMACIA'",
  })
  tipoSucursal: string;

  @Column("varchar2", { name: "TELEFONO", nullable: true, length: 30 })
  telefono: string | null;

  @PrimaryGeneratedColumn({ type: "number", name: "SUCURSAL_ID" })
  sucursalId: number;

  @Column("varchar2", { name: "NOMBRE", unique: true, length: 150 })
  nombre: string;

  @Column("number", {
    name: "LONGITUD",
    nullable: true,
    precision: 9,
    scale: 6,
  })
  longitud: number | null;

  @Column("number", { name: "LATITUD", nullable: true, precision: 9, scale: 6 })
  latitud: number | null;

  @Column("date", { name: "FECHA_APERTURA", default: () => "SYSDATE" })
  fechaApertura: Date;

  @Column("varchar2", { name: "ESTADO", length: 20, default: () => "'ACTIVA'" })
  estado: string;

  @Column("varchar2", { name: "DIRECCION", length: 300 })
  direccion: string;

  @OneToMany(() => ActivoFijo, (activoFijo) => activoFijo.sucursal)
  activoFijos: ActivoFijo[];

  @OneToMany(() => Caja, (caja) => caja.sucursal)
  cajas: Caja[];

  @OneToMany(() => Empleado, (empleado) => empleado.sucursal)
  empleados: Empleado[];

  @OneToMany(() => Entrega, (entrega) => entrega.sucursal)
  entregas: Entrega[];

  @OneToMany(
    () => HistorialActivo,
    (historialActivo) => historialActivo.sucursalDestino
  )
  historialActivos: HistorialActivo[];

  @OneToMany(
    () => HistorialActivo,
    (historialActivo) => historialActivo.sucursalOrigen
  )
  historialActivos2: HistorialActivo[];

  @OneToMany(() => Inventario, (inventario) => inventario.sucursal)
  inventarios: Inventario[];

  @OneToMany(() => Pedido, (pedido) => pedido.sucursalPreparacion)
  pedidos: Pedido[];

  @ManyToOne(() => Municipio, (municipio) => municipio.sucursals)
  @JoinColumn([{ name: "MUNICIPIO_ID", referencedColumnName: "municipioId" }])
  municipio: Municipio;

  @OneToMany(
    () => Transferencia,
    (transferencia) => transferencia.sucursalDestino
  )
  transferencias: Transferencia[];

  @OneToMany(
    () => Transferencia,
    (transferencia) => transferencia.sucursalOrigen
  )
  transferencias2: Transferencia[];
}
