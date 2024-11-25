import { likeIdStorageFilename, likeIdStorage, flush } from "./inMemoryDB.js";

export class PostLike {
    constructor(userId, postId) {
        this.id = likeIdStorage.likeId++;
        this.userId = userId;
        this.postId = postId;
        flush(likeIdStorageFilename, likeIdStorage);
    }
}
