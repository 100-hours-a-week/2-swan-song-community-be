// /api/v1/users

import express from 'express';
import 'express-async-errors';

import { ErrorWrapper } from '../module/errorWrapper.js';

import multer from 'multer';
import cookieParser from 'cookie-parser';

import { userController } from '../controller/userController.js';

import { getLoggedInUser, isLoggedIn } from '../module/authUtils.js';

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
        throw new ErrorWrapper(401, 4001, '인증 정보가 필요합니다.', null);
    }
    next(); // 인증된 경우 다음 미들웨어 또는 라우트로 진행
};

// 모든 라우트에 인가 미들웨어 적용
userRouter.use(checkAuthorization);

// 내 정보 조회
userRouter.get('/me', async (req, res) => {
    const sessionId = req.cookies.session_id;
    const user = getLoggedInUser(sessionId);

    const result = userController.findUserInfo(user.id);
    res.status(200).json(result);
});

// 회원정보 수정
userRouter.put('/me', upload.single('profileImage'), async (req, res) => {
    const nickname = req.body.nickname;
    const isProfileImageRemoved = req.body.isProfileImageRemoved === 'true';
    const profileImage = req.file;
    const sessionId = req.cookies.session_id;
    const user = getLoggedInUser(sessionId);

    if (
        (!nickname || nickname === user.nickname) &&
        isProfileImageRemoved === false &&
        !profileImage
    ) {
        throw new ErrorWrapper(400, 4000, '유효하지 않은 요청입니다', null);
    }

    const result = await userController.updateUser(user.id, {
        nickname,
        isProfileImageRemoved,
        profileImage,
    });
    res.status(200).json(result);
});

userRouter.patch('/me/password', upload.none(), async (req, res) => {
    const sessionId = req.cookies.session_id;
    const user = getLoggedInUser(sessionId);

    const { newPassword, passwordCheck } = req.body;

    // 비밀번호가 Base64 인코딩인지 확인
    if (
        !/^[A-Za-z0-9+/=]+$/.test(newPassword) ||
        !/^[A-Za-z0-9+/=]+$/.test(passwordCheck)
    ) {
        throw new ErrorWrapper(
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
        throw new ErrorWrapper(
            400,
            4000,
            '비밀번호는 8자 이상 20자 이하이어야 합니다',
            null,
        );
    }

    const result = await userController.updateUserPassword(user.id, {
        newPassword: newPassword,
        passwordCheck: passwordCheck,
    });
    res.status(200).json(result);
});

export default userRouter;
