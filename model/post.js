import { postIdStorageFilename, postIdStorage, flush } from "./inMemoryDB.js";

export class Post {
    constructor(title, content, contentImageUrl, userId) {
        this.id = postIdStorage.postId++;
        this.title = title;
        this.content = content;
        this.contentImageUrl = contentImageUrl;
        this.authorId = userId;
        this.createdDateTime = new Date();
        flush(postIdStorageFilename, postIdStorage);
    }
}
