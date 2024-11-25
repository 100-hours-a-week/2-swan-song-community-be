let autoIncrementPostId = 1;

export class Post {
    constructor(title, content, contentImageUrl, userId) {
        this.id = autoIncrementPostId++;
        this.title = title;
        this.content = content;
        this.contentImageUrl = contentImageUrl;
        this.authorId = userId;
        this.createdDateTime = new Date();
    }
}
