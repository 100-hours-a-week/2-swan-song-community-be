import { commentIdStorageFilename, commentIdStorage, flush } from "./inMemoryDB.js";

export class Comment {
    constructor(content, userId, postId) {
        this.id = commentIdStorage.commentId++;
        this.content = content;
        this.authorId = userId;
        this.postId = postId;
        this.createdDateTime = new Date();
        flush(commentIdStorageFilename, commentIdStorage);
    }
}
