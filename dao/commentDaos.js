import { comments, commentJsonFilename, flush } from '../model/inMemoryDB.js';
import { binarySearch } from '../dao/algorithm.js';

import { ErrorResponse } from '../dto/errorResponse.js';

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
            throw new ErrorResponse(200, 4004, '댓글을 찾을 수 없습니다', null);
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
            throw new ErrorResponse(200, 4004, '댓글을 찾을 수 없습니다', null);
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

class MariaDbCommentDao extends ICommentDao {
    async findById(conn, id) {
        const rows = await conn.query('SELECT * FROM comment WHERE id = ?', [
            id,
        ]);
        if (rows.length === 0) {
            throw new ErrorResponse(200, 4004, '댓글을 찾을 수 없습니다', null);
        }
        return rows[0];
    }

    async findByUserId(conn, userId) {
        const rows = await conn.query(
            'SELECT * FROM comment WHERE authorId = ?',
            [userId],
        );
        return rows;
    }

    async findByPostId(conn, postId) {
        const rows = await conn.query(
            'SELECT * FROM comment WHERE postId = ?',
            [postId],
        );
        return rows;
    }

    async createComment(conn, comment) {
        const { postId, authorId, content } = comment;
        const rows = await conn.query(
            'INSERT INTO comment (postId, authorId, content) VALUES (?, ?, ?) RETURNING *',
            [postId, authorId, content],
        );
        return rows[0];
    }

    async updateComment(conn, commentId, content) {
        await conn.query('UPDATE comment SET content = ? WHERE id = ?', [
            content,
            commentId,
        ]);
        const rows = await conn.query('SELECT * FROM comment WHERE id = ?', [
            commentId,
        ]);
        if (rows.length === 0) {
            throw new ErrorResponse(200, 4004, '댓글을 찾을 수 없습니다', null);
        }
        return rows[0];
    }

    async deleteComment(conn, commentId) {
        const result = await conn.query('DELETE FROM comment WHERE id = ?', [
            commentId,
        ]);
        if (result.affectedRows === 0) {
            throw new ErrorResponse(200, 4004, '댓글을 찾을 수 없습니다', null);
        }
    }

    async deleteCommentsByUserId(conn, userId) {
        await conn.query('DELETE FROM comment WHERE authorId = ?', [userId]);
    }
}

export const commentDao = new MariaDbCommentDao();
