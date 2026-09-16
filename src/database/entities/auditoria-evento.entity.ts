import { Column, Entity, Index, PrimaryGeneratedColumn } from "typeorm";

@Index("PK_AUDITORIA", ["auditoriaId"], { unique: true })
@Entity("AUDITORIA_EVENTO")
export class AuditoriaEvento {
  @Column("varchar2", { name: "USUARIO_BD", nullable: true, length: 128 })
  usuarioBd: string | null;

  @Column("varchar2", { name: "TABLA_AFECTADA", length: 128 })
  tablaAfectada: string;

  @Column("number", { name: "REGISTRO_ID", nullable: true })
  registroId: number | null;

  @Column("varchar2", { name: "OPERACION", length: 20 })
  operacion: string;

  @Column("varchar2", { name: "MODULO", nullable: true, length: 100 })
  modulo: string | null;

  @Column("varchar2", { name: "IP_CLIENTE", nullable: true, length: 64 })
  ipCliente: string | null;

  @Column("varchar2", { name: "HOST", nullable: true, length: 255 })
  host: string | null;

  @Column("timestamp", {
    name: "FECHA_EVENTO",
    scale: 6,
    default: () => "SYSTIMESTAMP",
  })
  fechaEvento: Date;

  @Column("varchar2", { name: "DESCRIPCION", nullable: true, length: 1000 })
  descripcion: string | null;

  @Column("varchar2", {
    name: "CLIENT_IDENTIFIER",
    nullable: true,
    length: 256,
  })
  clientIdentifier: string | null;

  @PrimaryGeneratedColumn({ type: "number", name: "AUDITORIA_ID" })
  auditoriaId: number;
}
