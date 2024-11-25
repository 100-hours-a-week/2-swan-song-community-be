import { viewHistories } from '../model/inMemoryDB.js';

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
    }

    deleteViewHistoriesByPostId(postId) {
        const historiesToDelete = this.viewHistories.filter(
            v => v.postId === postId,
        );
        historiesToDelete.forEach(v => {
            const idx = this.viewHistories.indexOf(v);
            this.viewHistories.splice(idx, 1);
        });
    }

    deleteViewHistoriesByUserId(userId) {
        const historiesToDelete = this.viewHistories.filter(
            v => v.userId === userId,
        );
        historiesToDelete.forEach(v => {
            const idx = this.viewHistories.indexOf(v);
            this.viewHistories.splice(idx, 1);
        });
    }
}

export const viewHistoryDao = new InMemoryViewHistoryDao(viewHistories);
