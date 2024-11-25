import { generateViewHistoryId } from './inMemoryDB.js';

export class ViewHistory {
    constructor(userId, postId) {
        this.id = generateViewHistoryId();
        this.userId = userId;
        this.postId = postId;
    }
}
