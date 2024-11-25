import { posts } from '../model/inMemoryDB.js';
import { binarySearch } from '../dao/algorithm.js';

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
            throw {
                code: 4004,
                message: '포스트를 찾을 수 없습니다',
                data: null,
            };
        }

        return this.posts[postId];
    }

    findAllByUserId(userId) {
        return this.posts.filter(post => post.userId === userId);
    }

    createPost(post) {
        this.posts.push(post);
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

        return post;
    }

    deletePost(post) {
        const postIdx = this.posts.indexOf(post);
        this.posts.splice(postIdx, 1);
    }
}

export const postDao = new InMemoryPostDao(posts);
