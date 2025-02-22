// /api/v1/auth

import express from 'express';
import 'express-async-errors';

import { withTransaction } from '../utils/transactionManager.js';

import { ErrorResponse } from '../dto/errorResponse.js';

import cookieParser from 'cookie-parser';

import { authController } from '../controller/authController.js';

import { getLoggedInUser, isLoggedIn } from '../utils/authUtils.js';
import {
    multipartImageProcessor,
    validateAndReturnExactImageContent,
} from '../middleware/MultipartImageProcessor.js';

const authRouter = express.Router();

// URL-encoded 데이터 파싱을 위한 미들웨어 추가
authRouter.use(express.urlencoded({ extended: true }));
// JSON 데이터 파싱을 위한 미들웨어 추가 (필요한 경우)
authRouter.use(express.json());
// 쿠키 파서 미들웨어 추가
authRouter.use(cookieParser());

// 회원가입
authRouter.post(
    '/signup',
    multipartImageProcessor.single('profileImage'),
    async (req, res) => {
        const email = req.body.email.trim();
        const password = req.body.password.trim();
        const passwordChecker = req.body.passwordChecker.trim();
        const nickname = req.body.nickname.trim();

        const profileImage = await validateAndReturnExactImageContent(req.file);

        // 필수 입력값 확인
        if (!email || !password || !passwordChecker || !nickname) {
            throw new ErrorResponse(
                400,
                4000,
                '유효하지 않은 요청입니다',
                null,
            );
        }

        if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email)) {
            throw new ErrorResponse(
                400,
                4000,
                '이메일 형식이 올바르지 않습니다',
                null,
            );
        }

        // 비밀번호가 Base64 인코딩인지 확인
        if (!/^[A-Za-z0-9+/=]+$/.test(password)) {
            throw new ErrorResponse(
                400,
                4000,
                '비밀번호는 Base64 인코딩 형식이어야 합니다',
                null,
            );
        }

        // 비밀번호 길이 확인
        const decodedPassword = Buffer.from(password, 'base64').toString(
            'utf-8',
        );

        const isValidLength =
            decodedPassword.length >= 8 && decodedPassword.length <= 20;
        const hasNumber = /[0-9]/.test(decodedPassword);
        const hasUpperCase = /[A-Z]/.test(decodedPassword);
        const hasLowerCase = /[a-z]/.test(decodedPassword);
        const hasSpecialChar = /[!@#$%^&*(),.?":;{}|<>]/.test(decodedPassword);
        const hasNoSpace = !/\s/.test(decodedPassword); // 공백이 없어야 함

        if (
            !isValidLength ||
            !hasNumber ||
            !hasUpperCase ||
            !hasLowerCase ||
            !hasSpecialChar ||
            !hasNoSpace
        ) {
            throw new ErrorResponse(
                400,
                4000,
                '비밀번호는 8자 이상 20자 이하이며, 공백 없이 특수문자, 대문자 영어, 소문자 영어, 숫자를 각각 하나 이상 포함해야 합니다',
                null,
            );
        }

        if (password !== passwordChecker) {
            throw new ErrorResponse(
                400,
                4000,
                '비밀번호가 일치하지 않습니다',
                null,
            );
        }

        if (!/^[^\s]{1,10}$/.test(nickname)) {
            throw new ErrorResponse(
                400,
                4000,
                '닉네임은 공백 없이 1자 이상 10자 이하이어야 합니다',
                null,
            );
        }

        const apiResponse = await withTransaction(async conn => {
            return await authController.register(
                conn,
                email,
                password,
                nickname,
                profileImage,
            );
        });
        apiResponse.resolve(res);
    },
);

// 닉네임 중복 여부 조회
authRouter.get('/check-nickname', async (req, res) => {
    const nickname = req.query.nickname?.trim() || null;

    if (nickname.length < 1 || nickname.length > 10) {
        throw new ErrorResponse(
            400,
            4000,
            '닉네임은 1자 이상 10자 이하이어야 합니다',
            { isAvailable: false },
        );
    }

    if (!/^[^\s]{1,10}$/.test(nickname)) {
        throw new ErrorResponse(
            200,
            4000,
            '닉네임은 공백 없이 1자 이상 10자 이하이어야 합니다',
            {
                isAvailable: false,
            },
        );
    }

    const result = await withTransaction(async conn => {
        return await authController.checkNicknameAvailability(conn, nickname);
    });
    res.status(200).json(result);
});

// 닉네임 중복 여부 조회
authRouter.get('/check-email', async (req, res) => {
    const email = req.query.email?.trim() || '';

    if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email)) {
        throw new ErrorResponse(400, 4000, '이메일 형식이 올바르지 않습니다', {
            isAvailable: false,
        });
    }

    const result = await withTransaction(async conn => {
        return await authController.checkEmailAvailability(conn, email);
    });
    res.status(200).json(result);
});

// 로그인
authRouter.post('/signin', multipartImageProcessor.none(), async (req, res) => {
    const email = req.body.email?.trim() || null;
    const password = req.body.password?.trim() || null;
    const sessionIdToRemove = req.cookies.session_id; // 기존에 발급된 세션 ID

    // 필수 입력값 확인
    if (!email || !password || email.length === 0 || password.length === 0) {
        throw new ErrorResponse(400, 4000, '유효하지 않은 요청입니다', null);
    }

    // 비밀번호가 Base64 인코딩인지 확인
    if (!/^[A-Za-z0-9+/=]+$/.test(password)) {
        throw new ErrorResponse(
            400,
            4000,
            '비밀번호는 Base64 인코딩 형식이어야 합니다',
            null,
        );
    }

    const apiResponse = await withTransaction(async conn => {
        return await authController.login(
            conn,
            res,
            sessionIdToRemove,
            email,
            password,
        );
    });
    apiResponse.resolve(res);
});

// 로그아웃
authRouter.post('/logout', async (req, res) => {
    const sessionId = req.cookies.session_id;

    if (sessionId === undefined) {
        throw new ErrorResponse(401, 4001, '유효하지 않은 요청입니다', null);
    }

    const apiResponse = await withTransaction(async  conn => {
        return authController.logout(conn, res, sessionId);
    });
    apiResponse.resolve(res);
});

// 회원 탈퇴
authRouter.delete('/withdrawal', async (req, res) => {
    const sessionId = req.cookies.session_id;

    if (sessionId === undefined) {
        throw new ErrorResponse(401, 4001, '유효하지 않은 요청입니다', null);
    }

    const userId = await withTransaction(async conn => {
        const user = await getLoggedInUser(conn, sessionId);
        return user.id;
    });

    const apiResponse = await withTransaction(async conn => {
        return await authController.withdraw(conn, res, sessionId, userId);
    });
    apiResponse.resolve(res);
});

// client에서 로그인 여부 확인을 위한 API
authRouter.get('/isLoggedIn', async (req, res) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new ErrorResponse(401, 4001, '인증이 필요합니다', {
            isLoggedIn: false,
        });
    }

    const token = authHeader.split(' ')[1];

    const loggedInStatus = await withTransaction(async conn => {
        return isLoggedIn(conn, token);
    });

    if (loggedInStatus) {
        return res.status(200).json({
            code: 200,
            message: '로그인 상태입니다.',
            data: { isLoggedIn: true },
        });
    } else {
        return res.status(401).json({
            code: 4001,
            message: '인증이 필요합니다.',
            data: { isLoggedIn: false },
        });
    }
});

export default authRouter;
