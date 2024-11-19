import { createPool } from 'mysql2/promise';
import { config } from 'dotenv';

config();

const pool = createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

const createTable = async () => {
    const usersTable = `
        CREATE TABLE IF NOT EXISTS users (
            id INT PRIMARY KEY AUTO_INCREMENT,
            dni VARCHAR(10) NOT NULL,
            name VARCHAR(50) NOT NULL,
            surname VARCHAR(50) NOT NULL,
            email VARCHAR(100) NOT NULL,
            phone VARCHAR(15) NOT NULL
        )`;

    const walletsTable = `
        CREATE TABLE IF NOT EXISTS wallets (
            id INT PRIMARY KEY AUTO_INCREMENT,
            user_id INT NOT NULL,
            balance DECIMAL(10, 2) NOT NULL DEFAULT 0,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )`;

    const sessionsTable = `
        CREATE TABLE IF NOT EXISTS sessions (
            id INT PRIMARY KEY AUTO_INCREMENT,
            session_id VARCHAR(32) NOT NULL,
            user_id INT NOT NULL,
            token VARCHAR(6) NOT NULL,
            amount DECIMAL(10, 2) NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )`;

    try {
        const connection = await pool.getConnection();
        await connection.query(usersTable);
        await connection.query(walletsTable);
        await connection.query(sessionsTable);
        connection.release();
        console.log('Tables created or already exist');
    }catch (error) {
        console.log('Error creating tables', error);
    }
};

//inicalizamos la db y creamos las tablas si no existen

export const getConnectionDB = async () => {
    try {
        await pool.getConnection();
        console.log('DB connected');
    } catch (error) {
        console.log('DB connection error', error);
    }
};

createTable();

export default pool;