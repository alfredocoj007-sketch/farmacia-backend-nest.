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
import { TransferenciaDetalle } from "./transferencia-detalle.entity";

@Index("PK_TRANSFERENCIA", ["transferenciaId"], { unique: true })
@Entity("TRANSFERENCIA")
export class Transferencia {
  @PrimaryGeneratedColumn({ type: "number", name: "TRANSFERENCIA_ID" })
  transferenciaId: number;

  @Column("varchar2", { name: "OBSERVACION", nullable: true, length: 500 })
  observacion: string | null;

  @Column("timestamp", {
    name: "FECHA_SOLICITUD",
    scale: 6,
    default: () => "SYSTIMESTAMP",
  })
  fechaSolicitud: Date;

  @Column("timestamp", { name: "FECHA_RECEPCION", nullable: true, scale: 6 })
  fechaRecepcion: Date | null;

  @Column("timestamp", { name: "FECHA_ENVIO", nullable: true, scale: 6 })
  fechaEnvio: Date | null;

  @Column("varchar2", {
    name: "ESTADO",
    length: 25,
    default: () => "'SOLICITADA'",
  })
  estado: string;

  @ManyToOne(() => Sucursal, (sucursal) => sucursal.transferencias)
  @JoinColumn([
    { name: "SUCURSAL_DESTINO_ID", referencedColumnName: "sucursalId" },
  ])
  sucursalDestino: Sucursal;

  @ManyToOne(() => Sucursal, (sucursal) => sucursal.transferencias2)
  @JoinColumn([
    { name: "SUCURSAL_ORIGEN_ID", referencedColumnName: "sucursalId" },
  ])
  sucursalOrigen: Sucursal;

  @OneToMany(
    () => TransferenciaDetalle,
    (transferenciaDetalle) => transferenciaDetalle.transferencia
  )
  transferenciaDetalles: TransferenciaDetalle[];
}
