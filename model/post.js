export class Post {
    constructor(title, content, contentImageUrl, userId) {
        this.id = 0;
        this.title = title;
        this.content = content;
        this.contentImageUrl = contentImageUrl;
        this.authorId = userId;
        this.createdDateTime = null;
    }
}
