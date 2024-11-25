import 'express-async-errors';

// DAO
import { postDao } from '../dao/postDaos.js';
import { commentDao } from '../dao/commentDaos.js';
import { viewHistoryDao } from '../dao/viewHistoryDaos.js';
import { userDao } from '../dao/userDaos.js';
import { postLikeDao } from '../dao/postLikeDaos.js';

// Data Model
import { Post } from '../model/post.js';
import { Comment } from '../model/comment.js';
import { ViewHistory } from '../model/viewHistory.js';
import { PostLike } from '../model/postLike.js';

import { saveImage, deleteImage } from '../module/imageUtils.js';

class PostController {
    constructor(postDao, commentDao, viewHistoryDao, userDao, postLikeDao) {
        this.postDao = postDao;
        this.commentDao = commentDao;
        this.viewHistoryDao = viewHistoryDao;
        this.userDao = userDao;
        this.postLikeDao = postLikeDao;
    }

    findDetailPostInfo(postId, commentFlag, userId) {
        const post = this.postDao.findById(postId);

        if (
            !this.viewHistoryDao.existsViewHistoriesByUserIdAndPostId(
                userId,
                postId,
            )
        ) {
            this.viewHistoryDao.createViewHistory(
                new ViewHistory(userId, post.id),
            );
        }

        const author = this.userDao.findById(post.authorId);

        if (!author) {
            throw {
                code: 4004,
                message: '작성자를 찾을 수 없습니다',
                data: null,
            };
        }

        const postComments = this.commentDao.findByPostId(post.id);

        const data = {
            postId: post.id,
            title: post.title,
            content: post.content,
            imageUrl: post.contentImageUrl,
            author: {
                id: author.id,
                name: author.nickname,
                profileImageUrl: author.profileImageUrl,
            },
            isLiked: postLikeDao.existsByUserIdAndPostId(userId, post.id),
            likeCount: postLikeDao.findByPostId(post.id).length,
            viewCount: this.viewHistoryDao.countViewHistoriesByPostId(post.id),
            commentCount: postComments.length,
            createdDateTime: post.createdDateTime,
        };

        // commentFlag에 따라 댓글 포함 여부 결정
        if (commentFlag === 'y') {
            data.comments = postComments.map(c => {
                const author = this.userDao.findById(c.authorId);

                return {
                    commentId: c.id,
                    content: c.content,
                    createdDateTime: c.createdDateTime,
                    author: {
                        id: author.id,
                        name: author.nickname,
                        profileImageUrl: author.profileImageUrl,
                    },
                };
            });
        }

        return {
            code: 2000,
            message: '게시글 상세 정보 단건 조회 성공',
            data: data,
        };
    }

    findAllSummaryPostInfo(queriedSize, queriedLastId) {
        const { targetPosts, hasNext, lastId } = this.postDao.getPaginatedPosts(
            queriedSize,
            queriedLastId,
        );

        const content = targetPosts.map(p => {
            const author = this.userDao.findById(p.authorId);

            return {
                postId: p.id,
                title: p.title,
                likeCount: this.postLikeDao.findByPostId(p.id).length,
                commentCount: this.commentDao.findByPostId(p.id).length,
                viewCount: this.viewHistoryDao.countViewHistoriesByPostId(p.id),
                createdDateTime: p.createdDateTime,
                authorName: author.nickname,
                profileImageUrl: author.profileImageUrl,
            };
        });

        // TODO: 다른 API 에서도 커서 페이징 응답 형식이 중복될 경우 따로 분리하여 재사용합시다.
        const data = {
            content: content,
            hasNext: hasNext,
            lastId: lastId,
        };

        if (data.content.length === 0) {
            return {
                code: 4004,
                message: '게시글이 존재하지 않습니다.',
                data: data,
            };
        }

        return {
            code: 2000,
            message: '게시글 요약 정보 전체 조회 성공',
            data: data,
        };
    }

    async createPost(postDto) {
        const { title, content, contentImage, user: author } = postDto;
        const contentImageUrl = contentImage
            ? await saveImage(contentImage)
            : null; // 이미지 저장
        const post = new Post(title, content, contentImageUrl, author.id);
        this.postDao.createPost(post);

        return { code: 2001, message: '성공', data: { postId: post.id } };
    }

    async updatePost(postId, updatePostDto) {
        const { title, content, contentImage, isRemoveImage } = updatePostDto;

        const currentPost = this.postDao.findById(postId);

        let contentImageUrl = currentPost.contentImageUrl;

        if (isRemoveImage === true && currentPost.contentImageUrl) {
            deleteImage(currentPost.contentImageUrl);
            contentImageUrl = null;
        }

        if (contentImageUrl === null && contentImage) {
            contentImageUrl = await saveImage(contentImage);
        }

        const updatedPostDto = { title, content, contentImageUrl };
        const updatedPost = this.postDao.updatePost(postId, updatedPostDto);

        return {
            code: 2000,
            message: '게시글 수정 성공',
            data: { postId: updatedPost.id },
        };
    }

    deletePost(postId) {
        const post = this.postDao.findById(postId);

        const commentsToDelete = this.commentDao.findByPostId(post.id);
        commentsToDelete.forEach(c => {
            this.commentDao.deleteComment(c.id);
        });

        const postLikesToDelete = this.postLikeDao.findByPostId(post.id);
        postLikesToDelete.forEach(l => {
            this.postLikeDao.deletePostLike(l);
        });

        this.viewHistoryDao.deleteViewHistoriesByPostId(post.id);

        this.postDao.deletePost(post);

        if (post.contentImageUrl) {
            deleteImage(post.contentImageUrl);
        }
        return;
    }

    createPostLike(userId, postId) {
        const post = this.postDao.findById(postId);
        const postLike = this.postLikeDao.existsByUserIdAndPostId(
            userId,
            post.id,
        );

        if (postLike === true) {
            throw {
                code: 4009,
                message: '이미 좋아요를 눌렀습니다',
                data: null,
            };
        }

        const newPostLike = new PostLike(userId, post.id);
        this.postLikeDao.createPostLike(newPostLike);

        return {
            code: 2001,
            message: '성공',
            data: { likeId: newPostLike.id },
        };
    }

    deletePostLike(userId, postId) {
        const post = this.postDao.findById(postId);
        const postLike = this.postLikeDao.findByUserIdAndPostId(
            userId,
            post.id,
        );

        if (postLike === undefined) {
            throw {
                code: 4004,
                message: '좋아요를 찾을 수 없습니다',
                data: null,
            };
        }

        this.postLikeDao.deletePostLike(postLike);
    }

    createPostComment(commentDto) {
        const { postId, content, author } = commentDto;

        const post = this.postDao.findById(postId);

        const newComment = new Comment(content, author.id, post.id);
        this.commentDao.createComment(newComment);

        // newComment 에서 authorId 를 통해 author 정보를 찾아온다.
        const commentResult = {
            commentId: newComment.id,
            content: newComment.content,
            postId: post.id,
            createdDateTime: newComment.createdDateTime,
            authorName: author.nickname,
            profileImageUrl: author.profileImageUrl,
        };

        return {
            code: 2001,
            message: '성공',
            data: { comment: commentResult },
        };
    }

    updatePostComment(commentId, content) {
        const updatedComment = this.commentDao.updateComment(
            commentId,
            content,
        );

        return {
            code: 2000,
            message: '댓글 수정 성공',
            data: { commentId: updatedComment.id },
        };
    }

    deletePostComment(commentId) {
        this.commentDao.deleteComment(commentId);
    }
}

export const postController = new PostController(
    postDao,
    commentDao,
    viewHistoryDao,
    userDao,
    postLikeDao,
);
