import { comments, commentJsonFilename, flush } from '../model/inMemoryDB.js';
import { binarySearch } from '../dao/algorithm.js';

import { ErrorWrapper } from '../module/errorWrapper.js';

class ICommentDao {
    constructor() {
        if (this.constructor === ICommentDao) {
            throw new Error("'ICommentDAO'는 객체를 생성할 수 없습니다.");
        }
    }

    findById(id) {
        throw new Error('구현되지 않은 메소드입니다.');
    }

    findByUserId(userId) {
        throw new Error('구현되지 않은 메소드입니다.');
    }

    findByPostId(postId) {
        throw new Error('구현되지 않은 메소드입니다.');
    }

    createComment(comment) {
        throw new Error('구현되지 않은 메소드입니다.');
    }

    updateComment(commentId, content) {
        throw new Error('구현되지 않은 메소드입니다.');
    }

    deleteComment(commentId) {
        throw new Error('구현되지 않은 메소드입니다.');
    }

    deleteCommentsByUserId(userId) {
        throw new Error('구현되지 않은 메소드입니다.');
    }
}

class InMemoryCommentDao extends ICommentDao {
    constructor(comments) {
        super();
        this.comments = comments;
    }

    findById(id) {
        const commentId = binarySearch(this.comments, id);

        if (commentId === -1) {
            throw new ErrorWrapper(200, 4004, '댓글을 찾을 수 없습니다', null);
        }

        return this.comments[commentId];
    }

    findByUserId(userId) {
        return this.comments.filter(c => c.authorId === userId);
    }

    findByPostId(postId) {
        return this.comments.filter(c => c.postId === postId);
    }

    createComment(comment) {
        this.comments.push(comment);
        flush(commentJsonFilename, this.comments);
        return comment;
    }

    updateComment(commentId, content) {
        const comment = this.findById(commentId);
        comment.content = content;
        flush(commentJsonFilename, this.comments);
        return comment;
    }

    deleteComment(commentId) {
        const commentIdx = binarySearch(this.comments, commentId);

        if (commentIdx === -1) {
            throw new ErrorWrapper(200, 4004, '댓글을 찾을 수 없습니다', null);
        }

        this.comments.splice(commentIdx, 1);
        flush(commentJsonFilename, this.comments);
    }

    deleteCommentsByUserId(userId) {
        const comments = this.findByUserId(userId);
        comments.forEach(comment => {
            this.deleteComment(comment.id);
        });
        flush(commentJsonFilename, this.comments);
    }
}

export const commentDao = new InMemoryCommentDao(comments);
