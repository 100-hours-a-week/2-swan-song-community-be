import { pool } from '../config/connect.js';

import 'express-async-errors';

const withTransaction = async callback => {
    let conn;
    try {
        conn = await pool.getConnection();
        await conn.beginTransaction();
        const result = await callback(conn);
        await conn.commit();
        return result;
    } catch (err) {
        if (conn) await conn.rollback();
        throw err;
    } finally {
        if (conn) await conn.release();
    }
};

export { withTransaction };
