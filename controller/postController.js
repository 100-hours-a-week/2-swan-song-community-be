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

import {
    saveImage,
    getPreSignedUrl,
    deleteImage,
} from '../utils/imageUtils.js';
import { formatDateTime } from '../utils/dateTimeUtils.js';

class PostController {
    constructor(postDao, commentDao, viewHistoryDao, userDao, postLikeDao) {
        this.postDao = postDao;
        this.commentDao = commentDao;
        this.viewHistoryDao = viewHistoryDao;
        this.userDao = userDao;
        this.postLikeDao = postLikeDao;
    }

    async findDetailPostInfo(conn, postId, commentFlag, userId) {
        const post = await this.postDao.findById(conn, postId);

        if (
            !(await this.viewHistoryDao.existsViewHistoriesByUserIdAndPostId(
                conn,
                userId,
                postId,
            ))
        ) {
            await this.viewHistoryDao.createViewHistory(
                conn,
                new ViewHistory(userId, post.id),
            );
        }

        const author = await this.userDao.findById(conn, post.authorId);

        if (!author) {
            throw new ErrorResponse(
                400,
                4004,
                '작성자를 찾을 수 없습니다',
                null,
            );
        }

        const postComments = await this.commentDao.findByPostId(conn, post.id);

        const data = {
            postId: post.id,
            title: post.title,
            content: post.content,
            imageUrl:
                post.contentImageKey &&
                (await getPreSignedUrl(post.contentImageKey)),
            author: {
                id: author.id,
                name: author.nickname,
                profileImageUrl:
                    author.profileImageKey &&
                    (await getPreSignedUrl(author.profileImageKey)),
            },
            isLiked: await postLikeDao.existsByUserIdAndPostId(
                conn,
                userId,
                post.id,
            ),
            likeCount: (await postLikeDao.findByPostId(conn, post.id)).length,
            viewCount: await this.viewHistoryDao.countViewHistoriesByPostId(
                conn,
                post.id,
            ),
            commentCount: postComments.length,
            createdDateTime: formatDateTime(post.createdDateTime),
        };

        // commentFlag에 따라 댓글 포함 여부 결정
        if (commentFlag === 'y') {
            data.comments = await Promise.all(
                postComments.map(async c => {
                    const author = await this.userDao.findById(
                        conn,
                        c.authorId,
                    );

                    return {
                        commentId: c.id,
                        content: c.content,
                        createdDateTime: formatDateTime(c.createdDateTime),
                        author: {
                            id: author.id,
                            name: author.nickname,
                            profileImageUrl:
                                author.profileImageKey &&
                                (await getPreSignedUrl(author.profileImageKey)),
                        },
                    };
                }),
            );
        }

        return new ApiResponse(
            200,
            2000,
            '게시글 상세 정보 단건 조회 성공',
            data,
        );
    }

    async findAllSummaryPostInfo(conn, queriedSize, queriedLastId) {
        const { targetPosts, hasNext, lastId } =
            await this.postDao.getPaginatedPosts(
                conn,
                queriedSize,
                queriedLastId,
            );

        const content = await Promise.all(
            targetPosts.map(async p => {
                const author = await this.userDao.findById(conn, p.authorId);

                return {
                    postId: p.id,
                    title: p.title,
                    likeCount: (await this.postLikeDao.findByPostId(conn, p.id))
                        .length,
                    commentCount: (
                        await this.commentDao.findByPostId(conn, p.id)
                    ).length,
                    viewCount:
                        await this.viewHistoryDao.countViewHistoriesByPostId(
                            conn,
                            p.id,
                        ),
                    createdDateTime: formatDateTime(p.createdDateTime),
                    author: {
                        id: author.id,
                        name: author.nickname,
                        profileImageUrl:
                            author.profileImageKey &&
                            (await getPreSignedUrl(author.profileImageKey)),
                    },
                };
            }),
        );

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

    async createPost(conn, postDto) {
        const { title, content, contentImage, user: author } = postDto;
        const s3Key = contentImage && (await saveImage(contentImage)).s3Key;

        const post = new Post(title, content, s3Key, author.id);
        const createdPost = await this.postDao.createPost(conn, post);

        const data = {
            postId: createdPost.id,
            title: createdPost.title,
            likeCount: (
                await this.postLikeDao.findByPostId(conn, createdPost.id)
            ).length,
            commentCount: (
                await this.commentDao.findByPostId(conn, createdPost.id)
            ).length,
            viewCount: await this.viewHistoryDao.countViewHistoriesByPostId(
                conn,
                createdPost.id,
            ),
            createdDateTime: formatDateTime(createdPost.createdDateTime),
            author: {
                id: author.id,
                name: author.nickname,
                profileImageUrl:
                    author.profileImageKey &&
                    (await getPreSignedUrl(author.profileImageKey)),
            },
        };
        return new ApiResponse(201, 2001, '게시글 추가 성공', data);
    }

    async updatePost(conn, postId, updatePostDto, userId) {
        const { title, content, contentImage, isRemoveImage } = updatePostDto;

        const currentPost = await this.postDao.findById(conn, postId);

        if (currentPost.authorId !== userId) {
            throw new ErrorResponse(200, 4003, '권한이 없습니다', null);
        }

        let contentImageKey = currentPost.contentImageKey;

        if (isRemoveImage === true && contentImageKey) {
            deleteImage(currentPost.contentImageKey);
            contentImageKey = null;
        }

        if (contentImageKey === null && contentImage) {
            contentImageKey = (await saveImage(contentImage)).s3Key;
        }

        const updatedPostDto = {
            title,
            content,
            contentImageKey: contentImageKey,
        };
        const updatedPost = await this.postDao.updatePost(
            conn,
            postId,
            updatedPostDto,
        );

        const data = { postId: updatedPost.id };
        return new ApiResponse(200, 2000, '게시글 수정 성공', data);
    }

    async deletePost(conn, postId, userId) {
        const post = await this.postDao.findById(conn, postId);

        if (post.authorId !== userId) {
            throw new ErrorResponse(200, 4003, '권한이 없습니다', null);
        }

        const commentsToDelete = await this.commentDao.findByPostId(
            conn,
            post.id,
        );
        await Promise.all(
            commentsToDelete.map(async c =>
                this.commentDao.deleteComment(conn, c.id),
            ),
        );

        const postLikesToDelete = await this.postLikeDao.findByPostId(
            conn,
            post.id,
        );
        await Promise.all(
            postLikesToDelete.map(async l =>
                this.postLikeDao.deletePostLike(conn, l),
            ),
        );

        await this.viewHistoryDao.deleteViewHistoriesByPostId(conn, post.id);

        await this.postDao.deletePost(conn, post);

        if (post.contentImageKey) {
            deleteImage(post.contentImageKey);
        }
        return new ApiResponse(204);
    }

    async createPostLike(conn, userId, postId) {
        const post = await this.postDao.findById(conn, postId);
        const postLike = await this.postLikeDao.existsByUserIdAndPostId(
            conn,
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
        await this.postLikeDao.createPostLike(conn, newPostLike);

        const data = { likeId: newPostLike.id };
        return new ApiResponse(201, 2001, '좋아요 추가 성공', data);
    }

    async deletePostLike(conn, userId, postId) {
        const post = await this.postDao.findById(conn, postId);
        const postLike = await this.postLikeDao.findByUserIdAndPostId(
            conn,
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

        await this.postLikeDao.deletePostLike(conn, postLike);

        return new ApiResponse(204);
    }

    async createPostComment(conn, commentDto) {
        const { postId, content, author } = commentDto;

        const post = await this.postDao.findById(conn, postId);

        const comment = new Comment(content, author.id, post.id);
        const newComment = await this.commentDao.createComment(conn, comment);

        // newComment 에서 authorId 를 통해 author 정보를 찾아온다.
        const commentResult = {
            commentId: newComment.id,
            content: newComment.content,
            postId: post.id,
            createdDateTime: formatDateTime(newComment.createdDateTime),
            author: {
                id: author.id,
                name: author.nickname,
                profileImageUrl:
                    author.profileImageKey &&
                    (await getPreSignedUrl(author.profileImageKey)),
            },
        };

        const data = { comment: commentResult };
        return new ApiResponse(201, 2001, '댓글 추가 성공', data);
    }

    async updatePostComment(conn, { commentId, content, user: author }) {
        const originalAuthorId = (
            await this.commentDao.findById(conn, commentId)
        ).authorId;

        if (originalAuthorId !== author.id)
            throw new ErrorResponse(403, 4003, '접근 권한이 없습니다.', null);

        const updatedComment = await this.commentDao.updateComment(
            conn,
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
                profileImageUrl:
                    author.profileImageKey &&
                    (await getPreSignedUrl(author.profileImageKey)),
            },
        };

        const data = { comment: commentResult };
        return new ApiResponse(200, 2000, '댓글 수정 성공', data);
    }

    async deletePostComment(conn, commentId, userId) {
        const comment = await this.commentDao.findById(conn, commentId);

        if (comment.authorId !== userId) {
            throw new ErrorResponse(200, 4003, '권한이 없습니다', null);
        }

        await this.commentDao.deleteComment(conn, commentId);
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
