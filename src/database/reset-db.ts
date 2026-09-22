import { AppDataSource } from './data-source';
import * as bcrypt from 'bcrypt';

async function resetDatabase() {
  console.log('🔄 Conectando a Oracle Database XE...');
  await AppDataSource.initialize();
  const queryRunner = AppDataSource.createQueryRunner();

  console.log('🧹 Limpiando tablas de datos transaccionales y de prueba...\n');

  // Tablas a vaciar en orden inverso de llaves foráneas
  const tablesToClear = [
    'AUDITORIA_EVENTO',
    'PLANILLA_DETALLE',
    'PLANILLA',
    'HISTORIAL_SALARIO',
    'HISTORIAL_ACTIVO',
    'ACTIVO_FIJO',
    'MOVIMIENTO_CAJA',
    'SESION_CAJA',
    'CAJA',
    'ENTREGA',
    'PEDIDO_DETALLE',
    'PEDIDO',
    'TRANSFERENCIA_DETALLE',
    'TRANSFERENCIA',
    'MOVIMIENTO_INVENTARIO',
    'INVENTARIO',
    'LOTE',
    'PRODUCTO',
    'CLIENTE',
  ];

  for (const table of tablesToClear) {
    try {
      const result = await queryRunner.query(`DELETE FROM "${table}"`);
      console.log(`  ✓ Tabla "${table}" vaciada con éxito.`);
    } catch (err: any) {
      console.warn(`  ⚠ Error al limpiar "${table}":`, err.message || err);
    }
  }

  // Reasignar empleados a Sucursal Central antes de eliminar sucursales de prueba secundarias
  try {
    const central = await queryRunner.query(`SELECT "SUCURSAL_ID" FROM "SUCURSAL" WHERE "NOMBRE" = 'Sucursal Central'`);
    const centralId = central?.[0]?.SUCURSAL_ID;
    if (centralId) {
      await queryRunner.query(`UPDATE "EMPLEADO" SET "SUCURSAL_ID" = :1`, [centralId]);
      await queryRunner.query(`DELETE FROM "SUCURSAL" WHERE "NOMBRE" != 'Sucursal Central'`);
      console.log(`  ✓ Sucursales secundarias de prueba eliminadas (se preservó Sucursal Central Matriz).`);
    }
  } catch (err: any) {
    console.warn(`  ⚠ Aviso en SUCURSAL:`, err.message || err);
  }

  // Asegurar catálogos esenciales
  console.log('\n🌱 Verificando y asegurando catálogos y usuarios base...');

  // 1. Roles
  const roles = [
    { nombre: 'ADMIN', desc: 'Administrador General del Sistema' },
    { nombre: 'VENDEDOR', desc: 'Vendedor y Cajero de Mostrador' },
    { nombre: 'FARMACEUTICO', desc: 'Regente y Supervisor de Farmacia' },
  ];
  for (const r of roles) {
    try {
      const exists = await queryRunner.query(`SELECT "ROL_ID" FROM "ROL" WHERE "NOMBRE" = :1`, [r.nombre]);
      if (!exists || exists.length === 0) {
        await queryRunner.query(
          `INSERT INTO "ROL" ("NOMBRE", "DESCRIPCION", "ESTADO") VALUES (:1, :2, 'ACTIVO')`,
          [r.nombre, r.desc]
        );
      }
    } catch (e) {}
  }
  console.log('  ✓ Roles base verificados.');

  // 2. Departamento y Municipio Matriz
  let depId = 1;
  const depCheck = await queryRunner.query(`SELECT "DEPARTAMENTO_ID" FROM "DEPARTAMENTO" WHERE "NOMBRE" = 'Guatemala'`);
  if (depCheck && depCheck.length > 0) {
    depId = depCheck[0].DEPARTAMENTO_ID;
  } else {
    const res = await queryRunner.query(`INSERT INTO "DEPARTAMENTO" ("NOMBRE") VALUES ('Guatemala') RETURNING "DEPARTAMENTO_ID" INTO :1`, [{ dir: 3003, type: 2010 }]);
    depId = res?.outBinds?.[0]?.[0] || 1;
  }

  let munId = 1;
  const munCheck = await queryRunner.query(`SELECT "MUNICIPIO_ID" FROM "MUNICIPIO" WHERE "NOMBRE" = 'Guatemala' AND "DEPARTAMENTO_ID" = :1`, [depId]);
  if (munCheck && munCheck.length > 0) {
    munId = munCheck[0].MUNICIPIO_ID;
  } else {
    const res = await queryRunner.query(`INSERT INTO "MUNICIPIO" ("NOMBRE", "DEPARTAMENTO_ID") VALUES ('Guatemala', :1) RETURNING "MUNICIPIO_ID" INTO :2`, [depId, { dir: 3003, type: 2010 }]);
    munId = res?.outBinds?.[0]?.[0] || 1;
  }
  console.log('  ✓ Geografía base (Guatemala / Guatemala) verificada.');

  // 3. Sucursal Central Matriz
  let sucId = 1;
  const sucCheck = await queryRunner.query(`SELECT "SUCURSAL_ID" FROM "SUCURSAL" WHERE "NOMBRE" = 'Sucursal Central'`);
  if (sucCheck && sucCheck.length > 0) {
    sucId = sucCheck[0].SUCURSAL_ID;
  } else {
    const res = await queryRunner.query(
      `INSERT INTO "SUCURSAL" ("NOMBRE", "DIRECCION", "MUNICIPIO_ID", "TIPO_SUCURSAL", "ESTADO") VALUES ('Sucursal Central', 'Zona 1, Ciudad de Guatemala', :1, 'FARMACIA', 'ACTIVA') RETURNING "SUCURSAL_ID" INTO :2`,
      [munId, { dir: 3003, type: 2010 }]
    );
    sucId = res?.outBinds?.[0]?.[0] || 1;
  }
  console.log(`  ✓ Sucursal Central Matriz (ID: ${sucId}) activa.`);

  // 4. Puestos
  const puestos = ['Administrador', 'Vendedor de Mostrador', 'Regente Farmacéutico'];
  for (const p of puestos) {
    try {
      const exists = await queryRunner.query(`SELECT "PUESTO_ID" FROM "PUESTO" WHERE "NOMBRE" = :1`, [p]);
      if (!exists || exists.length === 0) {
        await queryRunner.query(`INSERT INTO "PUESTO" ("NOMBRE", "ESTADO") VALUES (:1, 'ACTIVO')`, [p]);
      }
    } catch (e) {}
  }
  console.log('  ✓ Puestos de trabajo listos.');

  // 5. Empleados y Credenciales Demo
  const passHash = await bcrypt.hash('Test1234!', 10);

  // Admin
  const puestoAdmin = await queryRunner.query(`SELECT "PUESTO_ID" FROM "PUESTO" WHERE "NOMBRE" = 'Administrador'`);
  const puestoAdminId = puestoAdmin?.[0]?.PUESTO_ID || 1;
  const rolAdmin = await queryRunner.query(`SELECT "ROL_ID" FROM "ROL" WHERE "NOMBRE" = 'ADMIN'`);
  const rolAdminId = rolAdmin?.[0]?.ROL_ID || 1;

  let empAdminId = 1;
  const empAdminCheck = await queryRunner.query(`SELECT "EMPLEADO_ID" FROM "EMPLEADO" WHERE "DPI" = '2450123450101' OR ("NOMBRE" = 'Alfredo' AND "APELLIDO" = 'Coj')`);
  if (empAdminCheck && empAdminCheck.length > 0) {
    empAdminId = empAdminCheck[0].EMPLEADO_ID;
  } else {
    const res = await queryRunner.query(
      `INSERT INTO "EMPLEADO" ("NOMBRE", "APELLIDO", "SALARIO_ACTUAL", "FECHA_INGRESO", "PUESTO_ID", "SUCURSAL_ID", "ESTADO") VALUES ('Alfredo', 'Coj', 5000, SYSDATE, :1, :2, 'ACTIVO') RETURNING "EMPLEADO_ID" INTO :3`,
      [puestoAdminId, sucId, { dir: 3003, type: 2010 }]
    );
    empAdminId = res?.outBinds?.[0]?.[0] || 1;
  }

  // Credencial Admin
  const credAdminCheck = await queryRunner.query(`SELECT "CREDENCIAL_ID" FROM "CREDENCIAL" WHERE "USERNAME" = 'admin'`);
  if (credAdminCheck && credAdminCheck.length > 0) {
    await queryRunner.query(`UPDATE "CREDENCIAL" SET "PASSWORD_HASH" = :1, "ESTADO" = 'ACTIVO' WHERE "USERNAME" = 'admin'`, [passHash]);
  } else {
    await queryRunner.query(
      `INSERT INTO "CREDENCIAL" ("USERNAME", "PASSWORD_HASH", "EMPLEADO_ID", "ROL_ID", "ESTADO") VALUES ('admin', :1, :2, :3, 'ACTIVO')`,
      [passHash, empAdminId, rolAdminId]
    );
  }
  console.log('  ✓ Usuario "admin" configurado con clave "Test1234!"');

  // Vendedor
  const puestoVend = await queryRunner.query(`SELECT "PUESTO_ID" FROM "PUESTO" WHERE "NOMBRE" = 'Vendedor de Mostrador'`);
  const puestoVendId = puestoVend?.[0]?.PUESTO_ID || puestoAdminId;
  const rolVend = await queryRunner.query(`SELECT "ROL_ID" FROM "ROL" WHERE "NOMBRE" = 'VENDEDOR'`);
  const rolVendId = rolVend?.[0]?.ROL_ID || rolAdminId;

  let empVendId = 2;
  const empVendCheck = await queryRunner.query(`SELECT "EMPLEADO_ID" FROM "EMPLEADO" WHERE "NOMBRE" = 'Maria' AND "APELLIDO" = 'Lopez'`);
  if (empVendCheck && empVendCheck.length > 0) {
    empVendId = empVendCheck[0].EMPLEADO_ID;
  } else {
    const res = await queryRunner.query(
      `INSERT INTO "EMPLEADO" ("NOMBRE", "APELLIDO", "SALARIO_ACTUAL", "FECHA_INGRESO", "PUESTO_ID", "SUCURSAL_ID", "ESTADO") VALUES ('Maria', 'Lopez', 3200, SYSDATE, :1, :2, 'ACTIVO') RETURNING "EMPLEADO_ID" INTO :3`,
      [puestoVendId, sucId, { dir: 3003, type: 2010 }]
    );
    empVendId = res?.outBinds?.[0]?.[0] || 2;
  }

  const credVendCheck = await queryRunner.query(`SELECT "CREDENCIAL_ID" FROM "CREDENCIAL" WHERE "USERNAME" = 'vendedor1'`);
  if (credVendCheck && credVendCheck.length > 0) {
    await queryRunner.query(`UPDATE "CREDENCIAL" SET "PASSWORD_HASH" = :1, "ESTADO" = 'ACTIVO' WHERE "USERNAME" = 'vendedor1'`, [passHash]);
  } else {
    await queryRunner.query(
      `INSERT INTO "CREDENCIAL" ("USERNAME", "PASSWORD_HASH", "EMPLEADO_ID", "ROL_ID", "ESTADO") VALUES ('vendedor1', :1, :2, :3, 'ACTIVO')`,
      [passHash, empVendId, rolVendId]
    );
  }
  console.log('  ✓ Usuario "vendedor1" configurado con clave "Test1234!"');

  // 6. Métodos de Pago
  const metodosPago = ['Efectivo', 'Tarjeta de Crédito / Débito', 'Transferencia Bancaria'];
  for (const m of metodosPago) {
    try {
      const exists = await queryRunner.query(`SELECT "METODO_PAGO_ID" FROM "METODO_PAGO" WHERE "NOMBRE" = :1`, [m]);
      if (!exists || exists.length === 0) {
        await queryRunner.query(`INSERT INTO "METODO_PAGO" ("NOMBRE", "ESTADO") VALUES (:1, 'ACTIVO')`, [m]);
      }
    } catch (e) {}
  }
  console.log('  ✓ Métodos de pago registrados.');

  // 7. Categorías de Producto Básicas
  const categoriasProd = ['Analgésicos y Antiinflamatorios', 'Antibióticos', 'Cardiovascular', 'Gastrointestinal', 'Respiratorio'];
  for (const c of categoriasProd) {
    try {
      const exists = await queryRunner.query(`SELECT "CATEGORIA_ID" FROM "CATEGORIA_PRODUCTO" WHERE "NOMBRE" = :1`, [c]);
      if (!exists || exists.length === 0) {
        await queryRunner.query(`INSERT INTO "CATEGORIA_PRODUCTO" ("NOMBRE", "DESCRIPCION") VALUES (:1, 'Categoría farmacéutica base')`, [c]);
      }
    } catch (e) {}
  }

  // 8. Laboratorios Básicos
  const labs = ['Laboratorios Menarini', 'Bayer Guatemala', 'Laboratorios Vijosa', 'Pfizer Centroamérica'];
  for (const l of labs) {
    try {
      const exists = await queryRunner.query(`SELECT "LABORATORIO_ID" FROM "LABORATORIO" WHERE "NOMBRE" = :1`, [l]);
      if (!exists || exists.length === 0) {
        await queryRunner.query(`INSERT INTO "LABORATORIO" ("NOMBRE", "TELEFONO") VALUES (:1, '2200-0000')`, [l]);
      }
    } catch (e) {}
  }

  // 9. Unidades de Medida
  const unidades = [
    { nombre: 'Caja', abrev: 'CJA' },
    { nombre: 'Tableta', abrev: 'TAB' },
    { nombre: 'Frasco', abrev: 'FCO' },
    { nombre: 'Ampolla', abrev: 'AMP' },
  ];
  for (const u of unidades) {
    try {
      const exists = await queryRunner.query(`SELECT "UNIDAD_MEDIDA_ID" FROM "UNIDAD_MEDIDA" WHERE "NOMBRE" = :1`, [u.nombre]);
      if (!exists || exists.length === 0) {
        await queryRunner.query(`INSERT INTO "UNIDAD_MEDIDA" ("NOMBRE", "ABREVIATURA", "ESTADO") VALUES (:1, :2, 'ACTIVO')`, [u.nombre, u.abrev]);
      }
    } catch (e) {}
  }

  // 10. Categorías de Activos
  const categoriasActivos = [
    { nombre: 'Cadena de Frío / Refrigeración', vidaUtil: 60 },
    { nombre: 'Equipo de Cómputo y Servidores POS', vidaUtil: 36 },
    { nombre: 'Mobiliario y Estantería Farmacéutica', vidaUtil: 120 },
  ];
  for (const ca of categoriasActivos) {
    try {
      const exists = await queryRunner.query(`SELECT "CATEGORIA_ACTIVO_ID" FROM "CATEGORIA_ACTIVO" WHERE "NOMBRE" = :1`, [ca.nombre]);
      if (!exists || exists.length === 0) {
        await queryRunner.query(`INSERT INTO "CATEGORIA_ACTIVO" ("NOMBRE", "VIDA_UTIL_MESES", "ESTADO") VALUES (:1, :2, 'ACTIVO')`, [ca.nombre, ca.vidaUtil]);
      }
    } catch (e) {}
  }

  await queryRunner.release();
  await AppDataSource.destroy();

  console.log('\n=============================================================');
  console.log('✨ BASE DE DATOS LIMPIA Y REINICIALIZADA CON ÉXITO ✨');
  console.log('=============================================================');
  console.log('• Todos los productos, lotes, existencias y movimientos fueron vaciados.');
  console.log('• Todas las transferencias, pedidos y entregas fueron vaciadas.');
  console.log('• Todas las cajas, sesiones de caja y planillas fueron vaciadas.');
  console.log('• Toda la bitácora de auditoría fue vaciada.');
  console.log('• Se conservó la "Sucursal Central" (Matriz) y catálogos indispensables.');
  console.log('• Usuarios listos:');
  console.log('   - admin / Test1234!');
  console.log('   - vendedor1 / Test1234!');
  console.log('=============================================================\n');
}

resetDatabase().catch((err) => {
  console.error('❌ Error durante la limpieza de la base de datos:', err);
  process.exit(1);
});
