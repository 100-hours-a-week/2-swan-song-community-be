// api/v1/posts

import express from 'express';
import 'express-async-errors';
import { postController } from '../controller/postController.js';
import multer from 'multer';
import cookieParser from 'cookie-parser';
import { getLoggedInUser, isLoggedIn } from '../module/authUtils.js';
import { postDao } from '../dao/postDaos.js'; // 게시글 작성자를 얻기 위해 추가. (router 에서 직접 dao 를 사용하는건 부적절해보이지만 일단은 수용)
import { commentDao } from '../dao/commentDaos.js'; // 댓글 작성자를 얻기 위해 추가. (router 에서 직접 dao 를 사용하는건 부적절해보이지만 일단은 수용)

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
        return res.status(401).json({
            code: 4001,
            message: '인증 정보가 필요합니다.',
            data: null,
        });
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
        return res.status(400).json({
            code: 4000,
            message: '유효하지 않은 요청입니다',
            data: null,
        });
    }

    try {
        const result = postController.findDetailPostInfo(
            postId,
            commentFlag,
            user.id,
        );
        res.status(200).json(result);
    } catch (errorResponse) {
        res.status(200).json(errorResponse);
    }
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
        return res.status(400).json({
            code: 4000,
            message: '유효하지 않은 요청입니다',
            data: null,
        });
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
        return res.status(400).json({
            code: 4000,
            message: '유효하지 않은 요청입니다',
            data: null,
        });
    }

    try {
        const result = postController.createPostComment({
            postId,
            content,
            author: user,
        });
        res.status(201).json(result);
    } catch (errorResponse) {
        res.status(200).json(errorResponse);
    }
});

// 댓글 수정
postRouter.put('/comments', async (req, res) => {
    const commentId = parseInt(req.body.commentId);
    const content = req.body.content;
    const user = getLoggedInUser(req.cookies.session_id);

    if (!content || isNaN(commentId) || commentId < 1) {
        return res.status(400).json({
            code: 4000,
            message: '유효하지 않은 요청입니다',
            data: null,
        });
    }

    try {
        const result = postController.updatePostComment(
            commentId,
            content,
            user,
        );
        res.status(200).json(result);
    } catch (errorResponse) {
        res.status(200).json(errorResponse);
    }
});

// 댓글 삭제
postRouter.delete('/comments', async (req, res) => {
    const commentId = parseInt(req.body.commentId);
    const user = getLoggedInUser(req.cookies.session_id);

    if (isNaN(commentId) || commentId < 1) {
        return res.status(400).json({
            code: 4000,
            message: '유효하지 않은 요청입니다',
            data: null,
        });
    }

    // NOTE: 접근 권한(403)을 처리할 위치에 대한 고민:
    // 1. API 관점에서는 Router에서 403 처리하는 것이 자연스러울 수 있음.
    //    - 이유: Router는 API 앞단에서 요청을 매핑 및 필터링하고 Controller로 전달하는 역할이기 때문.
    // 2. 하지만, 실제로는 Controller에서 처리하는 편이 유지보수성과 코드 일관성 측면에서 더 나아 보임.
    //    - 이유: Router에서 직접 DAO를 접근하여 layered 아키텍쳐에서 좋은 형태가 아님.
    // 대안:
    // - Controller의 반환값에 상태 코드나 에러 메시지를 포함시켜, Router에서 HTTP 응답을 처리하도록 설계. (고려 중)
    // - 또는, Controller에서 res, req 객체를 직접 사용하는 방식을 선택.
    let comment;
    try {
        comment = commentDao.findById(commentId);
    } catch (errorResponse) {
        return res.status(200).json(errorResponse);
    }

    if (comment.authorId !== user.id) {
        return res.status(403).json({
            code: 4003,
            message: '접근 권한이 없습니다',
            data: null,
        });
    }

    try {
        postController.deletePostComment(commentId);
        res.status(204).send();
    } catch (errorResponse) {
        res.status(200).json(errorResponse);
    }
});

// 좋아요 추가
postRouter.post('/likes', async (req, res) => {
    const postId = parseInt(req.body.postId);
    const user = getLoggedInUser(req.cookies.session_id);

    if (!postId) {
        return res.status(400).json({
            code: 4000,
            message: '유효하지 않은 요청입니다',
            data: null,
        });
    }

    try {
        const result = postController.createPostLike(user.id, postId);
        res.status(201).json(result);
    } catch (errorResponse) {
        res.status(200).json(errorResponse);
    }
});

// 좋아요 삭제
postRouter.delete('/likes', async (req, res) => {
    const postId = parseInt(req.body.postId);
    const user = getLoggedInUser(req.cookies.session_id);

    if (!postId) {
        return res.status(400).json({
            code: 4000,
            message: '유효하지 않은 요청입니다',
            data: null,
        });
    }

    try {
        postController.deletePostLike(user.id, postId);
        res.status(204).send();
    } catch (errorResponse) {
        res.status(200).json(errorResponse);
    }
});

// 게시글 추가
postRouter.post('/', upload.single('postImage'), async (req, res) => {
    const { title, content } = req.body;
    const contentImage = req.file;
    const user = getLoggedInUser(req.cookies.session_id);

    if (!title || !content) {
        return res.status(400).json({
            code: 4000,
            message: '유효하지 않은 요청입니다',
            data: null,
        });
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
        return res.status(400).json({
            code: 4000,
            message: '유효하지 않은 요청입니다',
            data: null,
        });
    }

    if (postDao.findById(postId).authorId !== user.id) {
        return res.status(403).json({
            code: 4003,
            message: '접근 권한이 없습니다',
            data: null,
        });
    }

    const result = await postController.updatePost(postId, {
        title,
        content,
        contentImage,
        isRemoveImage,
    });

    return res.status(200).json(result);
});

// 게시글 삭제 (posts/like 와 경로가 겹쳐 게시글 삭제 API 를 아래에 위치시킴)
postRouter.delete('/:postId', async (req, res) => {
    const postId = parseInt(req.params.postId);
    const user = getLoggedInUser(req.cookies.session_id);

    if (isNaN(postId) || postId < 1) {
        return res.status(400).json({
            code: 4000,
            message: '유효하지 않은 요청입니다',
            data: null,
        });
    }

    if (postDao.findById(postId).authorId !== user.id) {
        return res.status(403).json({
            code: 4003,
            message: '접근 권한이 없습니다',
            data: null,
        });
    }

    postController.deletePost(postId);
    return res.status(204).send();
});

export default postRouter;
