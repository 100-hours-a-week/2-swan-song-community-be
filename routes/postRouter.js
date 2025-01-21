// api/v1/posts

import express from 'express';
import 'express-async-errors';

import { withTransaction } from '../utils/transactionManager.js';

import { ErrorResponse } from '../dto/errorResponse.js';

import multer from 'multer';
import cookieParser from 'cookie-parser';

import { postController } from '../controller/postController.js';

import { getLoggedInUser, isLoggedIn } from '../utils/authUtils.js';

const postRouter = express.Router();
const upload = multer({ dest: 'public/images/' }); // 이미지 업로드를 위한 multer 설정

// URL-encoded 데이터 파싱을 위한 미들웨어 추가
postRouter.use(express.urlencoded({ extended: true }));
// JSON 데이터 파싱을 위한 미들웨어 추가 (필요한 경우)
postRouter.use(express.json());
// 쿠키 파서 미들웨어 추가
postRouter.use(cookieParser());

// 인가 미들웨어 정의
const checkAuthorization = (req, res, next) => {
    const sessionId = req.cookies.session_id;

    if (!isLoggedIn(sessionId)) {
        throw new ErrorResponse(401, 4001, '인증 정보가 필요합니다.', null);
    }
    next(); // 인증된 경우 다음 미들웨어 또는 라우트로 진행
};

// 모든 라우트에 인가 미들웨어 적용
postRouter.use(checkAuthorization);

// 게시글 상세 정보 조회
postRouter.get('/:postId', async (req, res) => {
    const postId = parseInt(req.params.postId);
    const commentFlag = req.query.comment ? req.query.comment : 'y';
    const user = await withTransaction(
        async conn => await getLoggedInUser(conn, req.cookies.session_id),
    );

    // postId가 숫자가 아니거나 1보다 작거나, commentFlag가 y나 n이 아닌 경우 400 에러 반환
    if (
        isNaN(postId) ||
        postId < 1 ||
        (commentFlag !== 'y' && commentFlag !== 'n')
    ) {
        throw new ErrorResponse(400, 4000, '유효하지 않은 요청입니다', null);
    }

    const apiResponse = await withTransaction(
        async conn =>
            await postController.findDetailPostInfo(
                conn,
                postId,
                commentFlag,
                user.id,
            ),
    );
    apiResponse.resolve(res);
});

// 게시글 요약 정보 조회
postRouter.get('/', async (req, res) => {
    const size = req.query.size ? parseInt(req.query.size) : 5;
    const lastId = req.query.lastId ? parseInt(req.query.lastId) : null;

    // size가 숫자가 아니거나 0보다 작거나, lastId가 숫자가 아니거나 1보다 작은 경우 400 에러 반환 (lastId 가 null 인 경우는 제외)
    if (
        isNaN(size) ||
        size < 0 ||
        (lastId !== null && (isNaN(lastId) || lastId < 1))
    ) {
        throw new ErrorResponse(400, 4000, '유효하지 않은 요청입니다', null);
    }

    const apiResponse = await withTransaction(
        async conn =>
            await postController.findAllSummaryPostInfo(conn, size, lastId),
    );
    return apiResponse.resolve(res);
});

// 댓글 추가
postRouter.post('/comments', async (req, res) => {
    const postId = parseInt(req.body.postId);
    const content = req.body.content.trim();
    const user = await withTransaction(
        async conn => await getLoggedInUser(conn, req.cookies.session_id),
    );

    if (!postId || !content || content.length < 1) {
        throw new ErrorResponse(400, 4000, '유효하지 않은 요청입니다', null);
    }

    if (content.length > 300) {
        throw new ErrorResponse(400, 4000, `댓글은 300자 이하로 작성해주세요. 현재 길이 : ${content.length}`, null);
    }

    const apiResponse = await withTransaction(
        async conn =>
            await postController.createPostComment(conn, {
                postId,
                content,
                author: user,
            }),
    );
    apiResponse.resolve(res);
});

// 댓글 수정
postRouter.put('/comments', async (req, res) => {
    const commentId = parseInt(req.body.commentId);
    const content = req.body.content.trim();
    const user = await withTransaction(
        async conn => await getLoggedInUser(conn, req.cookies.session_id),
    );

    if (!content || content.length < 1 || isNaN(commentId) || commentId < 1) {
        throw new ErrorResponse(400, 4000, '유효하지 않은 요청입니다', null);
    }

    if (content.length > 300) {
        throw new ErrorResponse(400, 4000, `댓글은 300자 이하로 작성해주세요. 현재 길이 : ${content.length}`, null);
    }

    const apiResponse = await withTransaction(
        async conn =>
            await postController.updatePostComment(conn, {
                commentId,
                content,
                user,
            }),
    );
    apiResponse.resolve(res);
});

// 댓글 삭제
postRouter.delete('/comments', async (req, res) => {
    const commentId = parseInt(req.body.commentId);
    const user = await withTransaction(
        async conn => await getLoggedInUser(conn, req.cookies.session_id),
    );

    if (isNaN(commentId) || commentId < 1) {
        throw new ErrorResponse(400, 4000, '유효하지 않은 요청입니다', null);
    }

    const apiResponse = await withTransaction(
        async conn =>
            await postController.deletePostComment(conn, commentId, user.id),
    );
    apiResponse.resolve(res);
});

// 좋아요 추가
postRouter.post('/likes', async (req, res) => {
    const postId = parseInt(req.body.postId);
    const user = await withTransaction(
        async conn => await getLoggedInUser(conn, req.cookies.session_id),
    );

    if (!postId) {
        throw new ErrorResponse(400, 4000, '유효하지 않은 요청입니다', null);
    }

    const apiResponse = await withTransaction(
        async conn =>
            await postController.createPostLike(conn, user.id, postId),
    );
    apiResponse.resolve(res);
});

// 좋아요 삭제
postRouter.delete('/likes', async (req, res) => {
    const postId = parseInt(req.body.postId);
    const user = await withTransaction(
        async conn => await getLoggedInUser(conn, req.cookies.session_id),
    );

    if (!postId) {
        throw new ErrorResponse(400, 4000, '유효하지 않은 요청입니다', null);
    }

    const apiResponse = await withTransaction(
        async conn =>
            await postController.deletePostLike(conn, user.id, postId),
    );
    apiResponse.resolve(res);
});

// 게시글 추가
postRouter.post('/', upload.single('postImage'), async (req, res) => {
    const title = req.body.title.trim();
    const content = req.body.content.trim();
    const contentImage = req.file;
    const user = await withTransaction(
        async conn => await getLoggedInUser(conn, req.cookies.session_id),
    );

    if (!title || title.length < 1 || !content || content.length < 1) {
        throw new ErrorResponse(400, 4000, '유효하지 않은 요청입니다', null);
    }

    if (title.length > 26) {
        throw new ErrorResponse(400, 4000, `제목은 26자 이하로 작성해주세요. 현재 길이 : ${title.length}`, null);
    }

    if (content.length > 1000) {
        throw new ErrorResponse(400, 4000, `게시글은 1000자 이하로 작성해주세요. 현재 길이 : ${content.length}`, null);
    }

    const apiResponse = await withTransaction(
        async conn =>
            await postController.createPost(conn, {
                title,
                content,
                contentImage,
                user,
            }),
    );
    apiResponse.resolve(res);
});

// 게시글 수정
postRouter.put('/:postId', upload.single('postImage'), async (req, res) => {
    const postId = parseInt(req.params.postId);
    const title = req.body.title.trim();
    const content = req.body.content.trim();
    const removeImageFlag = req.body.removeImageFlag;
    const isRemoveImage = removeImageFlag === 'true';
    const contentImage = req.file;
    const user = await withTransaction(
        async conn => await getLoggedInUser(conn, req.cookies.session_id),
    );

    if (!title || title.length < 1 || !content || content.length < 1 || isNaN(postId) || postId < 1) {
        throw new ErrorResponse(400, 4000, '유효하지 않은 요청입니다', null);
    }

    if (title.length > 26) {
        throw new ErrorResponse(400, 4000, `제목은 26자 이하로 작성해주세요. 현재 길이 : ${title.length}`, null);
    }

    if (content.length > 1000) {
        throw new ErrorResponse(400, 4000, `게시글은 1000자 이하로 작성해주세요. 현재 길이 : ${content.length}`, null);
    }

    const apiResponse = await withTransaction(
        async conn =>
            await postController.updatePost(
                conn,
                postId,
                {
                    title,
                    content,
                    contentImage,
                    isRemoveImage,
                },
                user.id,
            ),
    );
    apiResponse.resolve(res);
});

// 게시글 삭제 (posts/like 와 경로가 겹쳐 게시글 삭제 API 를 아래에 위치시킴)
postRouter.delete('/:postId', async (req, res) => {
    const postId = parseInt(req.params.postId);
    const user = await withTransaction(
        async conn => await getLoggedInUser(conn, req.cookies.session_id),
    );

    if (isNaN(postId) || postId < 1) {
        throw new ErrorResponse(400, 4000, '유효하지 않은 요청입니다', null);
    }

    const apiResponse = await withTransaction(
        async conn => await postController.deletePost(conn, postId, user.id),
    );
    apiResponse.resolve(res);
});

export default postRouter;
