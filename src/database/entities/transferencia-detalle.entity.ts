import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Lote } from "./lote.entity";
import { Transferencia } from "./transferencia.entity";

@Index("PK_TRANS_DET", ["transferenciaDetalleId"], { unique: true })
@Index("UQ_TRANS_DET", ["transferenciaId", "loteId"], { unique: true })
@Entity("TRANSFERENCIA_DETALLE")
export class TransferenciaDetalle {
  @Column("number", { name: "TRANSFERENCIA_ID", unique: true })
  transferenciaId: number;

  @PrimaryGeneratedColumn({ type: "number", name: "TRANSFERENCIA_DETALLE_ID" })
  transferenciaDetalleId: number;

  @Column("number", { name: "LOTE_ID", unique: true })
  loteId: number;

  @Column("number", { name: "CANTIDAD_SOLICITADA", precision: 18, scale: 3 })
  cantidadSolicitada: number;

  @Column("number", {
    name: "CANTIDAD_RECIBIDA",
    precision: 18,
    scale: 3,
    default: () => "0",
  })
  cantidadRecibida: number;

  @Column("number", {
    name: "CANTIDAD_ENVIADA",
    precision: 18,
    scale: 3,
    default: () => "0",
  })
  cantidadEnviada: number;

  @ManyToOne(() => Lote, (lote) => lote.transferenciaDetalles)
  @JoinColumn([{ name: "LOTE_ID", referencedColumnName: "loteId" }])
  lote: Lote;

  @ManyToOne(
    () => Transferencia,
    (transferencia) => transferencia.transferenciaDetalles
  )
  @JoinColumn([
    { name: "TRANSFERENCIA_ID", referencedColumnName: "transferenciaId" },
  ])
  transferencia: Transferencia;
}
