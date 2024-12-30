export class Comment {
    constructor(content, userId, postId) {
        this.id = 0;
        this.content = content;
        this.authorId = userId;
        this.postId = postId;
        this.createdDateTime = null;
    }
}
