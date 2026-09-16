import { DataSource } from "typeorm";
import * as dotenv from 'dotenv';

dotenv.config(); // Cargar variables de entorno desde el archivo .env
export const AppDataSource = new DataSource({
    type: 'oracle',
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '1521', 10),
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    serviceName: process.env.DB_SERVICE_NAME,
    entities: ['src/database/entities/*{.ts,.js}'],
    migrations: ['src/database/migrations/*{.ts,.js}'],
    synchronize: false,
    logging:['error'],
});
