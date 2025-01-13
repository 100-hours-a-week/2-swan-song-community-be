import mariadb from 'mariadb';
import logger from '../utils/logger.js';
import dotenv from 'dotenv';

// .env 파일 로드
dotenv.config();

function getEnvVar(name) {
    const value = process.env[name];
    if (!value) {
        throw new Error(
            `Environment variable ${name} is required but not set.`,
        );
    }
    return value;
}

// 필수 환경변수 로드
const config = {
    host: getEnvVar('DB_URL'),
    port: parseInt(getEnvVar('DB_PORT'), 10),
    user: getEnvVar('DB_USER'),
    password: getEnvVar('DB_PASSWORD'),
    database: getEnvVar('DB_DATABASE'),
    connectionLimit: parseInt(getEnvVar('DB_CONNECTION_LIMIT'), 10),
};

const pool = mariadb.createPool(config);

async function asyncFunction() {
    logger.info(
        `DB Configuration: {DB_HOST: ${config.host}, DB_PORT: ${config.port}, DB_USER: ${config.user}, DB_DATABASE: ${config.database}, DB_CONNECTION_LIMIT: ${config.connectionLimit}}`,
    );
    let conn;
    try {
        conn = await pool.getConnection();
        logger.info(`Connected! (id=${conn.threadId})`);
    } catch (err) {
        logger.error(`Connection error: ${err.message}`);
    } finally {
        if (conn) await conn.close();
    }
}

asyncFunction();

export { pool };
