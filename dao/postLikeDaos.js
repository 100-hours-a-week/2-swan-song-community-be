import { likes } from '../model/inMemoryDB.js';

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
            throw {
                code: 4004,
                message: '댓글을 찾을 수 없습니다',
                data: null,
            };
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
        return postLike;
    }

    deletePostLike(postLike) {
        const postLikeIdx = this.postLikes.indexOf(postLike);

        if (postLikeIdx === -1) {
            throw {
                code: 4004,
                message: '댓글을 찾을 수 없습니다',
                data: null,
            };
        }

        this.postLikes.splice(postLikeIdx, 1);
    }

    deleteAllByUserId(userId) {
        const postLikesToDelete = this.postLikes.filter(
            c => c.userId === userId,
        );
        postLikesToDelete.forEach(c => {
            this.deletePostLike(c);
        });
    }
}

export const postLikeDao = new InMemoryPostLikeDao(likes);
