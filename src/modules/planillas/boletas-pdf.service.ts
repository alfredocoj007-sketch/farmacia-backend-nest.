import { Injectable, Logger } from '@nestjs/common';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfmake = require('pdfmake');

pdfmake.setUrlAccessPolicy(() => false);
pdfmake.setLocalAccessPolicy(() => true);
pdfmake.setFonts({
  Helvetica: {
    normal: 'Helvetica',
    bold: 'Helvetica-Bold',
    italics: 'Helvetica-Oblique',
    bolditalics: 'Helvetica-BoldOblique',
  },
});

export interface BoletaEmpleadoData {
  planillaDetalleId: number;
  nombreEmpleado: string;
  dpi: string;
  puestoNombre: string;
  sucursalNombre: string;
  salarioBase: number;
  salarioMensual: number;
  bonificaciones: number;
  horasExtra: number;
  descuentos: number;
  totalPagar: number;
}

export interface PlanillaBoletaData {
  planillaId: number;
  fechaInicio: string | Date;
  fechaFin: string | Date;
  fechaPago: string | Date | null;
  estado: string;
  cuentaOrigen?: string | null;
  metodoPago?: string | null;
  esQuincenal: boolean;
  detalles: BoletaEmpleadoData[];
}

@Injectable()
export class BoletasPdfService {
  private readonly logger = new Logger(BoletasPdfService.name);

  /**
   * Genera el documento PDF de Boletas de Pago para todos los colaboradores de la planilla.
   */
  async generarBoletasPlanillaPdf(data: PlanillaBoletaData): Promise<Buffer> {
    const content: any[] = [];

    data.detalles.forEach((det, index) => {
      const boletaContent = this.construirContenidoBoleta(data, det);
      content.push(...boletaContent);

      // Salto de página entre colaboradores si no es el último
      if (index < data.detalles.length - 1) {
        content.push({ text: '', pageBreak: 'after' });
      }
    });

    return this.crearPdfBuffer(content);
  }

  /**
   * Genera el documento PDF de Boleta de Pago para un colaborador individual.
   */
  async generarBoletaIndividualPdf(
    data: PlanillaBoletaData,
    detalleId: number,
  ): Promise<Buffer> {
    const detalle = data.detalles.find((d) => d.planillaDetalleId === detalleId);
    if (!detalle) {
      throw new Error(`Detalle de nómina #${detalleId} no encontrado en la planilla.`);
    }

    const content = this.construirContenidoBoleta(data, detalle);
    return this.crearPdfBuffer(content);
  }

  /**
   * Construye la estructura visual oficial de la boleta para un colaborador.
   */
  private construirContenidoBoleta(
    p: PlanillaBoletaData,
    d: BoletaEmpleadoData,
  ): any[] {
    const fInicio = this.formatearFecha(p.fechaInicio);
    const fFin = this.formatearFecha(p.fechaFin);
    const fPago = p.fechaPago ? this.formatearFecha(p.fechaPago) : this.formatearFecha(new Date());

    // Cálculo de valor de horas extra conforme al Código de Trabajo
    const sueldoBaseMensual = d.salarioMensual || (p.esQuincenal ? d.salarioBase * 2 : d.salarioBase);
    const valorHoraNormal = Number((sueldoBaseMensual / 240).toFixed(2));
    const valorHoraExtra = Number((valorHoraNormal * 1.5).toFixed(2));
    const cantidadHorasExtra =
      valorHoraExtra > 0 ? Number((d.horasExtra / valorHoraExtra).toFixed(1)) : 0;

    // Desglose de bonificaciones: Bono de Ley Decreto 37-2001 + Bonos Adicionales
    const bonoLeyPeriodo = p.esQuincenal ? 125.0 : 250.0;
    const bonoLey = Math.min(d.bonificaciones, bonoLeyPeriodo);
    const bonosAdicionales = Math.max(0, d.bonificaciones - bonoLey);

    // Totales
    const totalDevengado = Number((d.salarioBase + d.bonificaciones + d.horasExtra).toFixed(2));
    const totalDeducciones = Number(d.descuentos.toFixed(2));
    const totalNeto = Number(d.totalPagar.toFixed(2));

    const afiliacionIgss = d.dpi ? `${d.dpi.replace(/\s+/g, '')}-L` : 'EN TRÁMITE';

    return [
      // 1. ENCABEZADO INSTITUCIONAL
      {
        columns: [
          {
            width: '*',
            stack: [
              {
                text: 'FARMACIAS DE LA COMUNIDAD, S.A.',
                fontSize: 13,
                bold: true,
                color: '#0f766e',
              },
              {
                text: 'NIT: 9834102-4 · Afiliación Patronal IGSS: 45892-0',
                fontSize: 8,
                color: '#64748b',
                margin: [0, 2, 0, 0],
              },
              {
                text: `${d.sucursalNombre || 'Sede Farmacéutica Central'} · Ciudad de Guatemala`,
                fontSize: 8,
                color: '#64748b',
              },
            ],
          },
          {
            width: 220,
            stack: [
              {
                text: 'BOLETA DE PAGO DE SALARIO',
                fontSize: 11,
                bold: true,
                alignment: 'right',
                color: '#0f172a',
              },
              {
                text: 'COMPROBANTE OFICIAL DE NÓMINA',
                fontSize: 7.5,
                bold: true,
                alignment: 'right',
                color: '#0d9488',
                margin: [0, 1, 0, 0],
              },
              {
                text: `Período: Del ${fInicio} al ${fFin}`,
                fontSize: 8,
                alignment: 'right',
                margin: [0, 3, 0, 0],
              },
              {
                text: `Fecha de Pago / Emisión: ${fPago}`,
                fontSize: 8,
                alignment: 'right',
                color: '#475569',
              },
            ],
          },
        ],
      },
      {
        canvas: [
          {
            type: 'line',
            x1: 0,
            y1: 8,
            x2: 532,
            y2: 8,
            lineWidth: 1.5,
            lineColor: '#0d9488',
          },
        ],
        margin: [0, 0, 0, 10],
      },

      // 2. DATOS DEL COLABORADOR
      {
        table: {
          widths: ['50%', '50%'],
          body: [
            [
              {
                fillColor: '#f8fafc',
                stack: [
                  {
                    text: 'DATOS DEL COLABORADOR',
                    fontSize: 8,
                    bold: true,
                    color: '#0f766e',
                    margin: [0, 0, 0, 4],
                  },
                  {
                    text: [
                      { text: 'Nombre: ', bold: true },
                      d.nombreEmpleado,
                    ],
                  },
                  {
                    text: [
                      { text: 'DPI / CUI: ', bold: true },
                      d.dpi || '—',
                    ],
                  },
                  {
                    text: [
                      { text: 'No. Afiliación IGSS: ', bold: true },
                      afiliacionIgss,
                    ],
                  },
                ],
              },
              {
                fillColor: '#f8fafc',
                stack: [
                  {
                    text: 'INFORMACIÓN LABORAL & CONTRATACIÓN',
                    fontSize: 8,
                    bold: true,
                    color: '#0f766e',
                    margin: [0, 0, 0, 4],
                  },
                  {
                    text: [
                      { text: 'Puesto Laboral: ', bold: true },
                      d.puestoNombre,
                    ],
                  },
                  {
                    text: [
                      { text: 'Sucursal Asignada: ', bold: true },
                      d.sucursalNombre,
                    ],
                  },
                  {
                    text: [
                      { text: 'Modalidad de Pago: ', bold: true },
                      p.esQuincenal ? 'Quincenal (50% Sueldo Mensual)' : 'Mensual Completa (100%)',
                    ],
                  },
                ],
              },
            ],
          ],
        },
        layout: {
          hLineWidth: () => 0.5,
          vLineWidth: () => 0.5,
          hLineColor: () => '#cbd5e1',
          vLineColor: () => '#cbd5e1',
          paddingLeft: () => 8,
          paddingRight: () => 8,
          paddingTop: () => 6,
          paddingBottom: () => 6,
        },
        margin: [0, 0, 0, 12],
      },

      // 3. DETALLE DE INGRESOS Y DEDUCCIONES (EL CUERPO CENTRAL)
      {
        table: {
          widths: ['50%', '50%'],
          body: [
            [
              {
                text: 'INGRESOS (PERCEPCIONES)',
                bold: true,
                fontSize: 8,
                fillColor: '#f1f5f9',
                color: '#0f172a',
              },
              {
                text: 'DEDUCCIONES (DESCUENTOS)',
                bold: true,
                fontSize: 8,
                fillColor: '#f1f5f9',
                color: '#0f172a',
              },
            ],
            [
              {
                stack: [
                  this.renglonItem(
                    'Sueldo Base del Período',
                    `Q ${d.salarioBase.toFixed(2)}`,
                  ),
                  this.renglonItem(
                    'Bonificación Incentivo Ley (Dto. 37-2001)',
                    `Q ${bonoLey.toFixed(2)}`,
                  ),
                  d.horasExtra > 0
                    ? this.renglonItem(
                        `Horas Extra (${cantidadHorasExtra} hrs @ Q${valorHoraExtra}/hr)`,
                        `Q ${d.horasExtra.toFixed(2)}`,
                      )
                    : this.renglonItem('Horas Extra (0 hrs)', 'Q 0.00'),
                  bonosAdicionales > 0
                    ? this.renglonItem(
                        'Bonificaciones o Ajustes por Metas',
                        `Q ${bonosAdicionales.toFixed(2)}`,
                      )
                    : this.renglonItem('Ajustes / Bonos Extraordinarios', 'Q 0.00'),
                ],
              },
              {
                stack: [
                  this.renglonItem(
                    'Cuota Laboral IGSS (4.83% base afecta)',
                    `- Q ${d.descuentos.toFixed(2)}`,
                    '#b91c1c',
                  ),
                  this.renglonItem('Anticipos o Préstamos', 'Q 0.00'),
                  this.renglonItem('Otras Retenciones Judiciales / Plan', 'Q 0.00'),
                  this.renglonItem('Descuentos por Faltas o Sanción', 'Q 0.00'),
                ],
              },
            ],
            [
              {
                columns: [
                  {
                    text: 'TOTAL DEVENGADO (MASA BRUTA):',
                    bold: true,
                    fontSize: 8,
                    width: '*',
                  },
                  {
                    text: `Q ${totalDevengado.toFixed(2)}`,
                    bold: true,
                    fontSize: 9,
                    width: 'auto',
                    alignment: 'right',
                    color: '#0f766e',
                  },
                ],
                fillColor: '#f8fafc',
              },
              {
                columns: [
                  {
                    text: 'TOTAL DE DEDUCCIONES:',
                    bold: true,
                    fontSize: 8,
                    width: '*',
                  },
                  {
                    text: `- Q ${totalDeducciones.toFixed(2)}`,
                    bold: true,
                    fontSize: 9,
                    width: 'auto',
                    alignment: 'right',
                    color: '#b91c1c',
                  },
                ],
                fillColor: '#f8fafc',
              },
            ],
          ],
        },
        layout: {
          hLineWidth: () => 0.5,
          vLineWidth: () => 0.5,
          hLineColor: () => '#cbd5e1',
          vLineColor: () => '#cbd5e1',
          paddingLeft: () => 8,
          paddingRight: () => 8,
          paddingTop: () => 5,
          paddingBottom: () => 5,
        },
        margin: [0, 0, 0, 14],
      },

      // 4. TOTAL NETO Y CIERRE
      {
        table: {
          widths: ['*'],
          body: [
            [
              {
                fillColor: '#ecfdf5',
                columns: [
                  {
                    stack: [
                      {
                        text: 'LÍQUIDO A PERCIBIR (NETO A PAGAR)',
                        fontSize: 9.5,
                        bold: true,
                        color: '#065f46',
                      },
                      {
                        text: `Origen de Fondos: ${p.cuentaOrigen || 'Transferencia Bancaria Monetaria'}`,
                        fontSize: 7.5,
                        color: '#047857',
                        margin: [0, 2, 0, 0],
                      },
                    ],
                  },
                  {
                    text: `Q ${totalNeto.toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                    fontSize: 17,
                    bold: true,
                    color: '#047857',
                    alignment: 'right',
                  },
                ],
              },
            ],
          ],
        },
        layout: {
          hLineWidth: () => 1,
          vLineWidth: () => 1,
          hLineColor: () => '#10b981',
          vLineColor: () => '#10b981',
          paddingLeft: () => 10,
          paddingRight: () => 10,
          paddingTop: () => 8,
          paddingBottom: () => 8,
        },
        margin: [0, 0, 0, 28],
      },

      // ESPACIOS PARA FIRMAS LEGALES
      {
        columns: [
          {
            width: '*',
            stack: [
              {
                canvas: [
                  {
                    type: 'line',
                    x1: 20,
                    y1: 0,
                    x2: 210,
                    y2: 0,
                    lineWidth: 1,
                    lineColor: '#64748b',
                  },
                ],
              },
              {
                text: 'Firma del Colaborador (Recibí Conforme)',
                alignment: 'center',
                fontSize: 8,
                bold: true,
                margin: [0, 4, 0, 1],
              },
              {
                text: `DPI: ${d.dpi || '____________________'}`,
                alignment: 'center',
                fontSize: 7.5,
                color: '#64748b',
              },
            ],
          },
          {
            width: '*',
            stack: [
              {
                canvas: [
                  {
                    type: 'line',
                    x1: 30,
                    y1: 0,
                    x2: 220,
                    y2: 0,
                    lineWidth: 1,
                    lineColor: '#64748b',
                  },
                ],
              },
              {
                text: 'Firma y Sello de la Empresa',
                alignment: 'center',
                fontSize: 8,
                bold: true,
                margin: [0, 4, 0, 1],
              },
              {
                text: 'Administración / Recursos Humanos',
                alignment: 'center',
                fontSize: 7.5,
                color: '#64748b',
              },
            ],
          },
        ],
      },
    ];
  }

  private renglonItem(
    concepto: string,
    monto: string,
    color = '#1e293b',
  ): any {
    return {
      columns: [
        { text: concepto, width: '*', fontSize: 8.5 },
        {
          text: monto,
          width: 'auto',
          bold: true,
          alignment: 'right',
          fontSize: 8.5,
          color,
        },
      ],
      margin: [0, 2, 0, 2],
    };
  }

  private formatearFecha(f: string | Date): string {
    if (!f) return '—';
    const d = typeof f === 'string' ? new Date(f) : f;
    if (isNaN(d.getTime())) return String(f);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  }

  private crearPdfBuffer(content: any[]): Promise<Buffer> {
    const docDef = {
      pageSize: 'LETTER',
      pageMargins: [40, 40, 40, 40],
      defaultStyle: { font: 'Helvetica', fontSize: 9, color: '#1e293b' },
      content,
    };

    const pdf = pdfmake.createPdf(docDef);
    return pdf.getBuffer();
  }
}
