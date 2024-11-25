import { generateLikeId } from './inMemoryDB.js';

export class PostLike {
    constructor(userId, postId) {
        this.id = generateLikeId();
        this.userId = userId;
        this.postId = postId;
    }
}
