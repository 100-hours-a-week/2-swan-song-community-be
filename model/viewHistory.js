let autoIncrementViewHistoryId = 1;

export class ViewHistory {
    constructor(userId, postId) {
        this.id = autoIncrementViewHistoryId++;
        this.userId = userId;
        this.postId = postId;
    }
}
