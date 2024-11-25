import { generateCommentId } from './inMemoryDB.js';

export class Comment {
    constructor(content, userId, postId) {
        this.id = generateCommentId();
        this.content = content;
        this.authorId = userId;
        this.postId = postId;
        this.createdDateTime = new Date();
    }
}
