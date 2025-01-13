export class Post {
    constructor(title, content, contentImageKey, userId) {
        this.id = 0;
        this.title = title;
        this.content = content;
        this.contentImageKey = contentImageKey;
        this.authorId = userId;
        this.createdDateTime = null;
    }
}
