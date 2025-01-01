import { posts, postJsonFilename, flush } from '../model/inMemoryDB.js';
import { binarySearch } from '../dao/algorithm.js';

import { ErrorResponse } from '../dto/errorResponse.js';

class IPostDao {
    constructor() {
        if (this.constructor === IPostDao) {
            throw new Error("'IPostDAO'는 객체를 생성할 수 없습니다.");
        }
    }

    findById(id) {
        throw new Error('구현되지 않은 메소드입니다.');
    }

    findAllByUserId(userId) {
        throw new Error('구현되지 않은 메소드입니다.');
    }

    createPost(post) {
        throw new Error('구현되지 않은 메소드입니다.');
    }

    getPaginatedPosts(size, lastId) {
        throw new Error('구현되지 않은 메소드입니다.');
    }

    updatePost(postId, updatedPostDto) {
        throw new Error('구현되지 않은 메소드입니다.');
    }

    deletePost(post) {
        throw new Error('구현되지 않은 메소드입니다.');
    }
}

// NOTE: Map 도 두어 단일 조회 성능을 높이려 했으나 데이터 양이 많지 않은 상황에서 자료구조를 두 개나(posts, postsMap) 사용하는 것이 과하다 생각하였고
// 기본적으로 InMemory에서 Id 를 오름차순으로 두고 있어 이진 탐색으로도 뛰어난 조회 성능을 기대할 수 있다 판단하여 posts 만을 사용합니다.
class InMemoryPostDao extends IPostDao {
    constructor(posts) {
        super();
        this.posts = posts;
    }

    findById(id) {
        const postId = binarySearch(this.posts, id);

        if (postId === -1) {
            throw new ErrorResponse(
                200,
                4004,
                '포스트를 찾을 수 없습니다',
                null,
            );
        }

        return this.posts[postId];
    }

    findAllByUserId(userId) {
        return this.posts.filter(post => post.authorId === userId);
    }

    createPost(post) {
        this.posts.push(post);
        flush(postJsonFilename, this.posts);
        return post;
    }

    getPaginatedPosts(pSize, pLastId) {
        const lastPostIdx = pLastId
            ? binarySearch(this.posts, pLastId)
            : this.posts.length;

        // NOTE: lastPostIdx 를 -1 과 비교하는 이유는 두 가지입니다.
        //       1. getPaginatedPosts 에서 더이상 보내줄 데이터가 없을 때 반환하는 lastId 가 -1 이다.
        //       2. binarySearch 에서 찾지 못했을 때 반환하는 값이 -1 이다.
        if (lastPostIdx === -1)
            return { targetPosts: [], hasNext: false, lastId: -1 };

        const targetPosts = [];
        let idx = lastPostIdx;
        while (pSize-- > 0) {
            if (idx <= 0) break;
            idx--;
            targetPosts.push(this.posts[idx]);
        }

        const hasNext = idx > 0;
        const lastId = this.posts[idx] !== undefined ? this.posts[idx].id : -1;

        return { targetPosts, hasNext, lastId: lastId };
    }

    updatePost(postId, updatedPostDto) {
        const post = this.findById(postId);
        const { title, content, contentImageUrl } = updatedPostDto;

        post.title = title;
        post.content = content;
        post.contentImageUrl = contentImageUrl;
        flush(postJsonFilename, this.posts);
        return post;
    }

    deletePost(post) {
        const postIdx = this.posts.indexOf(post);
        this.posts.splice(postIdx, 1);
        flush(postJsonFilename, this.posts);
    }

    deleteAllByUserId(userId) {
        const posts = this.findAllByUserId(userId);
        posts.forEach(post => {
            this.deletePost(post);
        });
        flush(postJsonFilename, this.posts);
    }
}

class MariaDbPostDao extends IPostDao {
    async findById(conn, id) {
        const rows = await conn.query('SELECT * FROM post WHERE id = ?', [id]);

        if (rows.length === 0) {
            throw new ErrorResponse(
                200,
                4004,
                '포스트를 찾을 수 없습니다',
                null,
            );
        }

        return rows[0];
    }

    async findAllByUserId(conn, userId) {
        const rows = await conn.query('SELECT * FROM post WHERE authorId = ?', [
            userId,
        ]);
        return rows;
    }

    async createPost(conn, post) {
        const { title, content, contentImageUrl, authorId } = post;

        const rows = await conn.query(
            'INSERT INTO post (title, content, contentImageUrl, authorId) VALUES (?, ?, ?, ?) RETURNING *',
            [title, content, contentImageUrl, authorId],
        );

        return rows[0];
    }

    async getPaginatedPosts(conn, pSize, pLastId) {
        let query = 'SELECT * FROM post';
        const params = [];

        if (pLastId) {
            query += ' WHERE id < ?';
            params.push(pLastId);
        }

        query += ' ORDER BY id DESC LIMIT ?';
        params.push(pSize);

        const rows = await conn.query(query, params);

        const hasNext = rows.length === pSize;
        const lastId = hasNext ? rows[rows.length - 1].id : -1;

        return { targetPosts: rows, hasNext, lastId };
    }

    async updatePost(conn, postId, updatedPostDto) {
        const { title, content, contentImageUrl } = updatedPostDto;

        const result = await conn.query(
            'UPDATE post SET title = ?, content = ?, contentImageUrl = ? WHERE id = ?',
            [title, content, contentImageUrl, postId],
        );

        if (result.affectedRows === 0) {
            throw new ErrorResponse(
                200,
                4004,
                '포스트를 찾을 수 없습니다',
                null,
            );
        }

        return { id: postId, title, content, contentImageUrl };
    }

    async deletePost(conn, post) {
        const result = await conn.query('DELETE FROM post WHERE id = ?', [
            post.id,
        ]);

        if (result.affectedRows === 0) {
            throw new ErrorResponse(
                200,
                4004,
                '포스트를 찾을 수 없습니다',
                null,
            );
        }
    }

    async deleteAllByUserId(conn, userId) {
        await conn.query('DELETE FROM post WHERE authorId = ?', [userId]);
    }
}

export const postDao = new MariaDbPostDao();
