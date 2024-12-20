import 'express-async-errors';

// DTO
import { ApiResponse } from '../dto/apiResponse.js';
import { ErrorResponse } from '../dto/errorResponse.js';

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

import { saveImage, deleteImage } from '../utils/imageUtils.js';
import { formatDateTime } from '../utils/datetimeUtils.js';

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
            throw new ErrorResponse(
                400,
                4004,
                '작성자를 찾을 수 없습니다',
                null,
            );
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
            createdDateTime: formatDateTime(post.createdDateTime),
        };

        // commentFlag에 따라 댓글 포함 여부 결정
        if (commentFlag === 'y') {
            data.comments = postComments.map(c => {
                const author = this.userDao.findById(c.authorId);

                return {
                    commentId: c.id,
                    content: c.content,
                    createdDateTime: formatDateTime(c.createdDateTime),
                    author: {
                        id: author.id,
                        name: author.nickname,
                        profileImageUrl: author.profileImageUrl,
                    },
                };
            });
        }

        return new ApiResponse(
            200,
            2000,
            '게시글 상세 정보 단건 조회 성공',
            data,
        );
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
                createdDateTime: formatDateTime(p.createdDateTime),
                author: {
                    id: author.id,
                    name: author.nickname,
                    profileImageUrl: author.profileImageUrl,
                },
            };
        });

        // TODO: 다른 API 에서도 커서 페이징 응답 형식이 중복될 경우 따로 분리하여 재사용합시다.
        const data = {
            content: content,
            hasNext: hasNext,
            lastId: lastId,
        };

        if (data.content.length === 0) {
            throw new ErrorResponse(
                200,
                4004,
                '게시글이 존재하지 않습니다',
                data,
            );
        }

        return new ApiResponse(
            200,
            2000,
            '게시글 요약 정보 전체 조회 성공',
            data,
        );
    }

    async createPost(postDto) {
        const { title, content, contentImage, user: author } = postDto;
        const contentImageUrl = contentImage
            ? await saveImage(contentImage)
            : null; // 이미지 저장
        const post = new Post(title, content, contentImageUrl, author.id);
        this.postDao.createPost(post);

        const data = {
            postId: post.id,
            title: post.title,
            likeCount: this.postLikeDao.findByPostId(post.id).length,
            commentCount: this.commentDao.findByPostId(post.id).length,
            viewCount: this.viewHistoryDao.countViewHistoriesByPostId(post.id),
            createdDateTime: formatDateTime(post.createdDateTime),
            author: {
                id: author.id,
                name: author.nickname,
                profileImageUrl: author.profileImageUrl,
            },
        };
        return new ApiResponse(201, 2001, '게시글 추가 성공', data);
    }

    async updatePost(postId, updatePostDto, userId) {
        const { title, content, contentImage, isRemoveImage } = updatePostDto;

        const currentPost = this.postDao.findById(postId);

        if (currentPost.authorId !== userId) {
            throw new ErrorResponse(200, 4003, '권한이 없습니다', null);
        }

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

        const data = { postId: updatedPost.id };
        return new ApiResponse(200, 2000, '게시글 수정 성공', data);
    }

    deletePost(postId, userId) {
        const post = this.postDao.findById(postId);

        if (post.authorId !== userId) {
            throw new ErrorResponse(200, 4003, '권한이 없습니다', null);
        }

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
        return new ApiResponse(204);
    }

    createPostLike(userId, postId) {
        const post = this.postDao.findById(postId);
        const postLike = this.postLikeDao.existsByUserIdAndPostId(
            userId,
            post.id,
        );

        if (postLike === true) {
            throw new ErrorResponse(
                400,
                4009,
                '이미 좋아요를 눌렀습니다',
                null,
            );
        }

        const newPostLike = new PostLike(userId, post.id);
        this.postLikeDao.createPostLike(newPostLike);

        const data = { likeId: newPostLike.id };
        return new ApiResponse(201, 2001, '좋아요 추가 성공', data);
    }

    deletePostLike(userId, postId) {
        const post = this.postDao.findById(postId);
        const postLike = this.postLikeDao.findByUserIdAndPostId(
            userId,
            post.id,
        );

        if (postLike === undefined) {
            throw new ErrorResponse(
                400,
                4004,
                '좋아요를 찾을 수 없습니다',
                null,
            );
        }

        this.postLikeDao.deletePostLike(postLike);

        return new ApiResponse(204);
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
            createdDateTime: formatDateTime(newComment.createdDateTime),
            author: {
                id: author.id,
                name: author.nickname,
                profileImageUrl: author.profileImageUrl,
            },
        };

        const data = { comment: commentResult };
        return new ApiResponse(201, 2001, '댓글 추가 성공', data);
    }

    updatePostComment({ commentId, content, user: author }) {
        const originalAuthorId = this.commentDao.findById(commentId).authorId;

        if (originalAuthorId !== author.id)
            throw new ErrorResponse(403, 4003, '접근 권한이 없습니다.', null);

        const updatedComment = this.commentDao.updateComment(
            commentId,
            content,
        );

        const commentResult = {
            commentId: updatedComment.id,
            content: updatedComment.content,
            postId: updatedComment.postId,
            createdDateTime: formatDateTime(updatedComment.createdDateTime),
            author: {
                id: author.id,
                name: author.nickname,
                profileImageUrl: author.profileImageUrl,
            },
        };

        const data = { comment: commentResult };
        return new ApiResponse(200, 2000, '댓글 수정 성공', data);
    }

    deletePostComment(commentId, userId) {
        const comment = this.commentDao.findById(commentId);

        if (comment.authorId !== userId) {
            throw new ErrorResponse(200, 4003, '권한이 없습니다', null);
        }

        this.commentDao.deleteComment(commentId);
        return new ApiResponse(204);
    }
}

export const postController = new PostController(
    postDao,
    commentDao,
    viewHistoryDao,
    userDao,
    postLikeDao,
);
