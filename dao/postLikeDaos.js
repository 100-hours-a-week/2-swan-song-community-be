import { likes, likeJsonFilename, flush } from '../model/inMemoryDB.js';

import { ErrorResponse } from '../dto/errorResponse.js';

class IPostLikeDao {
    constructor() {
        if (this.constructor === IPostLikeDao) {
            throw new Error("'IPostLikeDAO'는 객체를 생성할 수 없습니다.");
        }
    }

    findById(id) {
        throw new Error('구현되지 않은 메소드입니다.');
    }

    findByPostId(postId) {
        throw new Error('구현되지 않은 메소드입니다.');
    }

    findByUserIdAndPostId(userId, postId) {
        throw new Error('구현되지 않은 메소드입니다.');
    }

    existsByUserIdAndPostId(userId, postId) {
        throw new Error('구현되지 않은 메소드입니다.');
    }

    createPostLike(postLike) {
        throw new Error('구현되지 않은 메소드입니다.');
    }

    deletePostLike(postLikeId) {
        throw new Error('구현되지 않은 메소드입니다.');
    }

    deleteAllLikeByUserId(userId) {
        throw new Error('구현되지 않은 메소드입니다.');
    }
}

class InMemoryPostLikeDao extends IPostLikeDao {
    constructor(postLikes) {
        super();
        this.postLikes = postLikes;
    }

    findById(id) {
        const postLikeId = this.postLikes.indexOf(c => c.id === id);

        if (postLikeId === -1) {
            throw new ErrorResponse(200, 4004, '댓글을 찾을 수 없습니다', null);
        }

        return this.postLikes[postLikeId];
    }

    findByPostId(postId) {
        return this.postLikes.filter(c => c.postId === postId);
    }

    findByUserIdAndPostId(userId, postId) {
        return this.postLikes.find(
            c => c.userId === userId && c.postId === postId,
        );
    }

    existsByUserIdAndPostId(userId, postId) {
        return this.postLikes.some(
            c => c.userId === userId && c.postId === postId,
        );
    }

    createPostLike(postLike) {
        this.postLikes.push(postLike);
        flush(likeJsonFilename, this.postLikes);
        return postLike;
    }

    deletePostLike(postLike) {
        const postLikeIdx = this.postLikes.indexOf(postLike);

        if (postLikeIdx === -1) {
            throw new ErrorResponse(200, 4004, '댓글을 찾을 수 없습니다', null);
        }

        this.postLikes.splice(postLikeIdx, 1);
        flush(likeJsonFilename, this.postLikes);
    }

    deleteAllByUserId(userId) {
        const postLikesToDelete = this.postLikes.filter(
            c => c.userId === userId,
        );
        postLikesToDelete.forEach(c => {
            this.deletePostLike(c);
        });
        flush(likeJsonFilename, this.postLikes);
    }
}

class MariaDbPostLikeDao extends IPostLikeDao {
    async findById(conn, id) {
        const rows = await conn.query('SELECT * FROM post_like WHERE id = ?', [
            id,
        ]);

        if (rows.length === 0) {
            throw new ErrorResponse(
                200,
                4004,
                '좋아요를 찾을 수 없습니다',
                null,
            );
        }

        return rows[0];
    }

    async findByPostId(conn, postId) {
        const rows = await conn.query(
            'SELECT * FROM post_like WHERE postId = ?',
            [postId],
        );
        return rows;
    }

    async findByUserIdAndPostId(conn, userId, postId) {
        const rows = await conn.query(
            'SELECT * FROM post_like WHERE userId = ? AND postId = ?',
            [userId, postId],
        );
        return rows[0] || null;
    }

    async existsByUserIdAndPostId(conn, userId, postId) {
        const rows = await conn.query(
            'SELECT COUNT(*) AS count FROM post_like WHERE userId = ? AND postId = ?',
            [userId, postId],
        );
        return rows[0].count > 0;
    }

    async createPostLike(conn, postLike) {
        const { userId, postId } = postLike;

        const rows = await conn.query(
            'INSERT INTO post_like (userId, postId) VALUES (?, ?) RETURNING *',
            [userId, postId],
        );

        return rows[0];
    }

    async deletePostLike(conn, postLike) {
        const { userId, postId } = postLike;

        const result = await conn.query(
            'DELETE FROM post_like WHERE userId = ? AND postId = ?',
            [userId, postId],
        );

        if (result.affectedRows === 0) {
            throw new ErrorResponse(
                200,
                4004,
                '좋아요를 찾을 수 없습니다',
                null,
            );
        }
    }

    async deleteAllByUserId(conn, userId) {
        await conn.query('DELETE FROM post_like WHERE userId = ?', [userId]);
    }
}

export const postLikeDao = new MariaDbPostLikeDao();
