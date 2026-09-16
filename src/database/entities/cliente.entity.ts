import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Municipio } from "./municipio.entity";
import { Pedido } from "./pedido.entity";

@Index("PK_CLIENTE", ["clienteId"], { unique: true })
@Index("UQ_CLIENTE_TELEFONO", ["telefono"], { unique: true })
@Entity("CLIENTE")
export class Cliente {
  @Column("varchar2", { name: "TELEFONO", unique: true, length: 30 })
  telefono: string;

  @Column("varchar2", {
    name: "REFERENCIA_DIRECCION",
    nullable: true,
    length: 300,
  })
  referenciaDireccion: string | null;

  @Column("varchar2", { name: "NOMBRE", length: 100 })
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

  @Column("timestamp", {
    name: "FECHA_REGISTRO",
    scale: 6,
    default: () => "SYSTIMESTAMP",
  })
  fechaRegistro: Date;

  @Column("varchar2", { name: "ESTADO", length: 20, default: () => "'ACTIVO'" })
  estado: string;

  @Column("varchar2", { name: "EMAIL", nullable: true, length: 150 })
  email: string | null;

  @Column("varchar2", { name: "DIRECCION", length: 400 })
  direccion: string;

  @PrimaryGeneratedColumn({ type: "number", name: "CLIENTE_ID" })
  clienteId: number;

  @Column("varchar2", { name: "APELLIDO", nullable: true, length: 100 })
  apellido: string | null;

  @ManyToOne(() => Municipio, (municipio) => municipio.clientes)
  @JoinColumn([{ name: "MUNICIPIO_ID", referencedColumnName: "municipioId" }])
  municipio: Municipio;

  @OneToMany(() => Pedido, (pedido) => pedido.cliente)
  pedidos: Pedido[];
}
