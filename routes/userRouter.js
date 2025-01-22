// /api/v1/users

import express from 'express';
import 'express-async-errors';

import { withTransaction } from '../utils/transactionManager.js';

import { ErrorResponse } from '../dto/errorResponse.js';

import multer from 'multer';
import cookieParser from 'cookie-parser';

import { userController } from '../controller/userController.js';

import { getLoggedInUser, isLoggedIn } from '../utils/authUtils.js';

const userRouter = express.Router();
const upload = multer({ dest: 'public/images/' }); // 이미지 업로드를 위한 multer 설정

// URL-encoded 데이터 파싱을 위한 미들웨어 추가
userRouter.use(express.urlencoded({ extended: true }));
// JSON 데이터 파싱을 위한 미들웨어 추가 (필요한 경우)
userRouter.use(express.json());
// 쿠키 파서 미들웨어 추가
userRouter.use(cookieParser());

// 인가 미들웨어 정의
const checkAuthorization = (req, res, next) => {
    const sessionId = req.cookies.session_id;

    if (!isLoggedIn(sessionId)) {
        throw new ErrorResponse(401, 4001, '인증 정보가 필요합니다.', null);
    }
    next(); // 인증된 경우 다음 미들웨어 또는 라우트로 진행
};

// 모든 라우트에 인가 미들웨어 적용
userRouter.use(checkAuthorization);

// 내 정보 조회
userRouter.get('/me', async (req, res) => {
    const sessionId = req.cookies.session_id;
    const user = await withTransaction(async conn => {
        return await getLoggedInUser(conn, sessionId);
    });

    const apiResponse = await withTransaction(async conn => {
        return await userController.findUserInfo(conn, user.id);
    });
    apiResponse.resolve(res);
});

// 회원정보 수정
userRouter.put('/me', upload.single('profileImage'), async (req, res) => {
    const nickname = req.body.nickname.trim();
    const isProfileImageRemoved = req.body.isProfileImageRemoved === 'true';
    const profileImage = req.file;
    const sessionId = req.cookies.session_id;
    const user = await withTransaction(async conn => {
        return await getLoggedInUser(conn, sessionId);
    });

    if (
        (!nickname || nickname === user.nickname) &&
        isProfileImageRemoved === false &&
        !profileImage
    ) {
        throw new ErrorResponse(400, 4000, '유효하지 않은 요청입니다', null);
    }

    const apiResponse = await withTransaction(async conn => {
        return await userController.updateUser(conn, user.id, {
            nickname,
            isProfileImageRemoved,
            profileImage,
        });
    });
    apiResponse.resolve(res);
});

userRouter.patch('/me/password', upload.none(), async (req, res) => {
    const sessionId = req.cookies.session_id;
    const user = await withTransaction(async conn => {
        return await getLoggedInUser(conn, sessionId);
    });

    const { newPassword, passwordCheck } = req.body;

    // 비밀번호가 Base64 인코딩인지 확인
    if (
        !/^[A-Za-z0-9+/=]+$/.test(newPassword) ||
        !/^[A-Za-z0-9+/=]+$/.test(passwordCheck)
    ) {
        throw new ErrorResponse(
            400,
            4000,
            '비밀번호는 Base64 인코딩 형식이어야 합니다',
            null,
        );
    }

    // 비밀번호 길이 확인
    const decodedPassword = Buffer.from(newPassword, 'base64').toString(
        'utf-8',
    );
    if (decodedPassword.length < 8 || decodedPassword.length > 20) {
        throw new ErrorResponse(
            400,
            4000,
            '비밀번호는 8자 이상 20자 이하이어야 합니다',
            null,
        );
    }

    const apiResponse = await withTransaction(async conn => {
        return await userController.updateUserPassword(conn, user.id, {
            newPassword,
            passwordCheck,
        });
    });
    apiResponse.resolve(res);
});

export default userRouter;
