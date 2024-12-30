import {
    viewHistories,
    viewHistoryJsonFilename,
    flush,
} from '../model/inMemoryDB.js';

class IViewHistoryDao {
    constructor() {
        if (new.target === IViewHistoryDao) {
            throw new Error("'IViewHistoryDao'는 객체를 생성할 수 없습니다.");
        }
    }

    countViewHistoriesByUserIdAndPostId(userId, postId) {
        throw new Error('구현되지 않은 메소드입니다.');
    }

    createViewHistory(viewHistory) {
        throw new Error('구현되지 않은 메소드입니다.');
    }

    deleteViewHistoriesByPostId(postId) {
        throw new Error('구현되지 않은 메소드입니다.');
    }

    deleteViewHistoriesByUserId(userId) {
        throw new Error('구현되지 않은 메소드입니다.');
    }
}

class InMemoryViewHistoryDao extends IViewHistoryDao {
    constructor(viewHistories) {
        super();
        this.viewHistories = viewHistories; // 기존 inMemDB의 viewHistories 사용
    }

    existsViewHistoriesByUserIdAndPostId(userId, postId) {
        const viewHistoryId = this.viewHistories.findIndex(
            v => v.userId === userId && v.postId === postId,
        );

        if (viewHistoryId === -1) {
            return false;
        }

        return true;
    }

    countViewHistoriesByPostId(postId) {
        return this.viewHistories.filter(v => v.postId === postId).length;
    }

    createViewHistory(viewHistory) {
        this.viewHistories.push(viewHistory);
        flush(viewHistoryJsonFilename, this.viewHistories);
    }

    deleteViewHistoriesByPostId(postId) {
        const historiesToDelete = this.viewHistories.filter(
            v => v.postId === postId,
        );
        historiesToDelete.forEach(v => {
            const idx = this.viewHistories.indexOf(v);
            this.viewHistories.splice(idx, 1);
        });
        flush(viewHistoryJsonFilename, this.viewHistories);
    }

    deleteViewHistoriesByUserId(userId) {
        const historiesToDelete = this.viewHistories.filter(
            v => v.userId === userId,
        );
        historiesToDelete.forEach(v => {
            const idx = this.viewHistories.indexOf(v);
            this.viewHistories.splice(idx, 1);
        });
        flush(viewHistoryJsonFilename, this.viewHistories);
    }
}

class MariaDbViewHistoryDao extends IViewHistoryDao {
    async existsViewHistoriesByUserIdAndPostId(conn, userId, postId) {
        const rows = await conn.query(
            'SELECT COUNT(*) AS count FROM view_history WHERE userId = ? AND postId = ?',
            [userId, postId],
        );
        return rows[0].count > 0;
    }

    async countViewHistoriesByPostId(conn, postId) {
        const rows = await conn.query(
            'SELECT COUNT(*) AS count FROM view_history WHERE postId = ?',
            [postId],
        );
        return rows[0].count;
    }

    async createViewHistory(conn, viewHistory) {
        const { userId, postId, viewedAt } = viewHistory;
        const rows = await conn.query(
            'INSERT INTO view_history (userId, postId) VALUES (?, ?) RETURNING *',
            [userId, postId, viewedAt],
        );
        return rows[0];
    }

    async deleteViewHistoriesByPostId(conn, postId) {
        await conn.query('DELETE FROM view_history WHERE postId = ?', [postId]);
    }

    async deleteViewHistoriesByUserId(conn, userId) {
        await conn.query('DELETE FROM view_history WHERE userId = ?', [userId]);
    }
}

export const viewHistoryDao = new MariaDbViewHistoryDao();
