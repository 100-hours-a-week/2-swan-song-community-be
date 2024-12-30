import mariadb from 'mariadb';
import logger from '../utils/logger.js';
import fs from 'fs';

const defaultConfig = {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
};

const CONFIG_FILE = './credential.json';

function loadConfig() {
    try {
        if (fs.existsSync(CONFIG_FILE)) {
            const fileConfig = JSON.parse(
                fs.readFileSync(CONFIG_FILE, 'utf-8'),
            );
            return fileConfig.db;
        } else {
            return defaultConfig;
        }
    } catch (err) {
        return defaultConfig;
    }
}

const config = loadConfig();

const pool = mariadb.createPool(config);

async function asyncFunction() {
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
