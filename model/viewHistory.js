import { viewHistoryIdStorageFilename, viewHistoryIdStorage, flush } from './inMemoryDB.js';

export class ViewHistory {
    constructor(userId, postId) {
        this.id = viewHistoryIdStorage.viewHistoryId++;
        this.userId = userId;
        this.postId = postId;
        flush(viewHistoryIdStorageFilename, viewHistoryIdStorage);
    }
}
