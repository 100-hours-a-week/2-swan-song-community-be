import { ErrorResponse } from '../dto/errorResponse.js';

class ILoginSessionDao {
    constructor() {
        if (this.constructor === ILoginSessionDao) {
            throw new Error("'ILoginSessionDao'는 객체를 생성할 수 없습니다.");
        }
    }

    findBySessionId(id) {
        throw new Error('구현되지 않은 메소드입니다.');
    }

    findByUserId(userId) {
        throw new Error('구현되지 않은 메소드입니다.');
    }

    createLoginSession(loginSession) {
        throw new Error('구현되지 않은 메소드입니다.');
    }

    deleteLoginSessionBySessionId(loginSession) {
        throw new Error('구현되지 않은 메소드입니다.');
    }

    deleteAllByUserId(userId) {
        throw new Error('구현되지 않은 메소드입니다.');
    }
}

class MariaDbLoginSessionDao extends ILoginSessionDao {
    async findBySessionId(conn, sessionId) {
        const rows = await conn.query('SELECT * FROM login_session WHERE sessionId = ?', [
            sessionId,
        ]);

        if (rows.length === 0) {
            throw new ErrorResponse(
                200,
                4001,
                '로그인 세션을 찾을 수 없습니다',
                null,
            );
        }

        return rows[0];
    }

    async findByUserId(conn, userId) {
        const rows = await conn.query(
            'SELECT * FROM login_session WHERE userId = ?',
            [userId],
        );
        return rows;
    }

    async createLoginSession(conn, loginSession) {
        const { sessionId, userId } = loginSession;

        const rows = await conn.query(
            'INSERT INTO login_session (sessionId, userId) VALUES (?, ?)',
            [sessionId, userId],
        );

        return rows[0];
    }

    async deleteLoginSessionBySessionId(conn, sessionId) {
        const result = await conn.query(
            'DELETE FROM login_session WHERE sessionId = ?',
            [sessionId],
        );

        if (result.affectedRows === 0) {
            throw new ErrorResponse(
                200,
                4004,
                '세션을 찾을 수 없습니다',
                null,
            );
        }
    }

    async deleteAllByUserId(conn, userId) {
        await conn.query(
            'DELETE FROM login_session WHERE userId = ?',
            [userId],
        );
    }
}

export const loginSessionDao = new MariaDbLoginSessionDao();
