import { AppDataSource } from './data-source';
import { Departamento } from './entities/departamento.entity';
import { Municipio } from './entities/municipio.entity';
import { Sucursal } from './entities/sucursal.entity';
import { Puesto } from './entities/puesto.entity';
import { Empleado } from './entities/empleado.entity';
import { Rol } from './entities/rol.entity';
import { Credencial } from './entities/credencial.entity';
import * as bcrypt from 'bcrypt';

async function main() {
  await AppDataSource.initialize();

  const departamento = await AppDataSource.getRepository(Departamento).save({
    nombre: 'Guatemala',
  });

  const municipio = await AppDataSource.getRepository(Municipio).save({
    nombre: 'Guatemala',
    departamentoId: departamento.departamentoId,
  });

  const sucursal = await AppDataSource.getRepository(Sucursal).save({
    nombre: 'Sucursal Central',
    direccion: 'Zona 1, Ciudad de Guatemala',
    municipio,
  });

  const puestoAdmin = await AppDataSource.getRepository(Puesto).save({
    nombre: 'Administrador',
  });

  const empleadoAdmin = await AppDataSource.getRepository(Empleado).save({
    nombre: 'Alfredo',
    apellido: 'Coj',
    salarioActual: 5000,
    fechaIngreso: new Date(),
    puesto: puestoAdmin,
    sucursal,
  });

  const rolAdmin = await AppDataSource.getRepository(Rol).save({
    nombre: 'ADMIN',
  });

  const passwordHash = await bcrypt.hash('Test1234!', 10);

  await AppDataSource.getRepository(Credencial).save({
    username: 'admin',
    passwordHash,
    empleadoId: empleadoAdmin.empleadoId,
    rol: rolAdmin,
  });

  const puestoVendedor = await AppDataSource.getRepository(Puesto).save({
    nombre: 'Vendedor de Mostrador',
  });

  const empleadoVendedor = await AppDataSource.getRepository(Empleado).save({
    nombre: 'Maria',
    apellido: 'Lopez',
    salarioActual: 3200,
    fechaIngreso: new Date(),
    puesto: puestoVendedor,
    sucursal,
  });

  const rolVendedor = await AppDataSource.getRepository(Rol).save({
    nombre: 'VENDEDOR',
  });

  await AppDataSource.getRepository(Credencial).save({
    username: 'vendedor1',
    passwordHash,
    empleadoId: empleadoVendedor.empleadoId,
    rol: rolVendedor,
  });

  console.log('Seed OK.');
  console.log('  admin / Test1234! (rol ADMIN)');
  console.log('  vendedor1 / Test1234! (rol VENDEDOR)');
  await AppDataSource.destroy();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
