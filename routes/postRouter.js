// api/v1/posts

import express from 'express';
import 'express-async-errors';

import { ErrorWrapper } from '../module/errorWrapper.js';

import multer from 'multer';
import cookieParser from 'cookie-parser';

import { postController } from '../controller/postController.js';

import { getLoggedInUser, isLoggedIn } from '../module/authUtils.js';

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
        throw new ErrorWrapper(401, 4001, '인증 정보가 필요합니다.', null);
    }
    next(); // 인증된 경우 다음 미들웨어 또는 라우트로 진행
};

// 모든 라우트에 인가 미들웨어 적용
postRouter.use(checkAuthorization);

// 게시글 상세 정보 조회
postRouter.get('/:postId', async (req, res) => {
    const postId = parseInt(req.params.postId);
    const commentFlag = req.query.comment ? req.query.comment : 'y';
    const user = getLoggedInUser(req.cookies.session_id);

    // postId가 숫자가 아니거나 1보다 작거나, commentFlag가 y나 n이 아닌 경우 400 에러 반환
    if (
        isNaN(postId) ||
        postId < 1 ||
        (commentFlag !== 'y' && commentFlag !== 'n')
    ) {
        throw new ErrorWrapper(400, 4000, '유효하지 않은 요청입니다', null);
    }

    const result = postController.findDetailPostInfo(
        postId,
        commentFlag,
        user.id,
    );
    return res.status(200).json(result);
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
        throw new ErrorWrapper(400, 4000, '유효하지 않은 요청입니다', null);
    }

    const result = postController.findAllSummaryPostInfo(size, lastId);
    return res.status(200).json(result);
});

// 댓글 추가
postRouter.post('/comments', async (req, res) => {
    const postId = parseInt(req.body.postId);
    const content = req.body.content;
    const user = getLoggedInUser(req.cookies.session_id);

    if (!postId || !content) {
        throw new ErrorWrapper(400, 4000, '유효하지 않은 요청입니다', null);
    }

    const result = postController.createPostComment({
        postId,
        content,
        author: user,
    });
    res.status(201).json(result);
});

// 댓글 수정
postRouter.put('/comments', async (req, res) => {
    const commentId = parseInt(req.body.commentId);
    const content = req.body.content;
    const user = getLoggedInUser(req.cookies.session_id);

    if (!content || isNaN(commentId) || commentId < 1) {
        throw new ErrorWrapper(400, 4000, '유효하지 않은 요청입니다', null);
    }

    const result = postController.updatePostComment(commentId, content, user);
    res.status(200).json(result);
});

// 댓글 삭제
postRouter.delete('/comments', async (req, res) => {
    const commentId = parseInt(req.body.commentId);
    const user = getLoggedInUser(req.cookies.session_id);

    if (isNaN(commentId) || commentId < 1) {
        throw new ErrorWrapper(400, 4000, '유효하지 않은 요청입니다', null);
    }

    postController.deletePostComment(commentId, user.id);
    res.status(204).send();
});

// 좋아요 추가
postRouter.post('/likes', async (req, res) => {
    const postId = parseInt(req.body.postId);
    const user = getLoggedInUser(req.cookies.session_id);

    if (!postId) {
        throw new ErrorWrapper(400, 4000, '유효하지 않은 요청입니다', null);
    }

    const result = postController.createPostLike(user.id, postId);
    res.status(201).json(result);
});

// 좋아요 삭제
postRouter.delete('/likes', async (req, res) => {
    const postId = parseInt(req.body.postId);
    const user = getLoggedInUser(req.cookies.session_id);

    if (!postId) {
        throw new ErrorWrapper(400, 4000, '유효하지 않은 요청입니다', null);
    }

    postController.deletePostLike(user.id, postId);
    res.status(204).send();
});

// 게시글 추가
postRouter.post('/', upload.single('postImage'), async (req, res) => {
    const { title, content } = req.body;
    const contentImage = req.file;
    const user = getLoggedInUser(req.cookies.session_id);

    if (!title || !content) {
        throw new ErrorWrapper(400, 4000, '유효하지 않은 요청입니다', null);
    }

    const result = await postController.createPost({
        title,
        content,
        contentImage,
        user,
    });

    return res.status(201).json(result);
});

// 게시글 수정
postRouter.put('/:postId', upload.single('postImage'), async (req, res) => {
    const postId = parseInt(req.params.postId);
    const { title, content, removeImageFlag } = req.body;
    const isRemoveImage = removeImageFlag === 'true';
    const contentImage = req.file;
    const user = getLoggedInUser(req.cookies.session_id);

    if (!title || !content || isNaN(postId) || postId < 1) {
        throw new ErrorWrapper(400, 4000, '유효하지 않은 요청입니다', null);
    }

    const result = await postController.updatePost(
        postId,
        {
            title,
            content,
            contentImage,
            isRemoveImage,
        },
        user.id,
    );

    return res.status(200).json(result);
});

// 게시글 삭제 (posts/like 와 경로가 겹쳐 게시글 삭제 API 를 아래에 위치시킴)
postRouter.delete('/:postId', async (req, res) => {
    const postId = parseInt(req.params.postId);
    const user = getLoggedInUser(req.cookies.session_id);

    if (isNaN(postId) || postId < 1) {
        throw new ErrorWrapper(400, 4000, '유효하지 않은 요청입니다', null);
    }

    postController.deletePost(postId, user.id);
    return res.status(204).send();
});

export default postRouter;
