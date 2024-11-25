// /api/v1/auth

import express from 'express';
import 'express-async-errors';
import { authController } from '../controller/authController.js';
import multer from 'multer';
import cookieParser from 'cookie-parser';

import { getLoggedInUser, isLoggedIn } from '../module/authUtils.js';

const authRouter = express.Router();
const upload = multer({ dest: 'public/images/' }); // 이미지 업로드를 위한 multer 설정

// URL-encoded 데이터 파싱을 위한 미들웨어 추가
authRouter.use(express.urlencoded({ extended: true }));
// JSON 데이터 파싱을 위한 미들웨어 추가 (필요한 경우)
authRouter.use(express.json());
// 쿠키 파서 미들웨어 추가
authRouter.use(cookieParser());

// 회원가입
authRouter.post('/signup', upload.single('profileImage'), async (req, res) => {
    const { email, password, passwordChecker, nickname } = req.body;

    const profileImage = req.file;

    // 필수 입력값 확인
    if (!email || !password || !passwordChecker || !nickname) {
        return res
            .status(400)
            .json({ code: 4000, message: '유효하지 않은 요청입니다' });
    }

    // 비밀번호가 Base64 인코딩인지 확인
    if (!/^[A-Za-z0-9+/=]+$/.test(password)) {
        return res.status(400).json({
            code: 4000,
            message: '비밀번호는 Base64 인코딩 형식이어야 합니다',
        });
    }

    // 비밀번호 길이 확인
    const decodedPassword = Buffer.from(password, 'base64').toString('utf-8');
    if (decodedPassword.length < 8 || decodedPassword.length > 20) {
        return res.status(400).json({
            code: 4000,
            message: '비밀번호는 8자 이상 20자 이하이어야 합니다',
        });
    }

    if (password !== passwordChecker) {
        return res
            .status(400)
            .json({ code: 4000, message: '비밀번호가 일치하지 않습니다' });
    }

    if (nickname.length < 1 || nickname.length > 10) {
        return res.status(400).json({
            code: 4000,
            message: '닉네임은 1자 이상 10자 이하이어야 합니다',
        });
    }

    try {
        const result = await authController.register(
            email,
            password,
            nickname,
            profileImage,
        );
        res.status(200).json(result);
    } catch (errorResponse) {
        res.status(200).json(errorResponse);
    }
});

// 닉네임 중복 여부 조회
authRouter.get('/check-nickname', (req, res) => {
    const { nickname } = req.query;

    if (!nickname) {
        return res
            .status(400)
            .json({ code: 4000, message: '유효하지 않은 요청입니다' });
    }

    if (nickname.length < 1 || nickname.length > 10) {
        return res.status(400).json({
            code: 4000,
            message: '닉네임은 1자 이상 10자 이하이어야 합니다',
        });
    }

    try {
        const result = authController.checkNicknameAvailability(nickname);
        res.status(200).json(result);
    } catch (errorResponse) {
        res.status(200).json(errorResponse);
    }
});

// 로그인
authRouter.post('/signin', upload.none(), async (req, res) => {
    const { email, password } = req.body;
    const sessionId = req.cookies.session_id;

    // 필수 입력값 확인
    if (!email || !password || email.length === 0 || password.length === 0) {
        return res
            .status(400)
            .json({ code: 4000, message: '유효하지 않은 요청입니다' });
    }

    // 비밀번호가 Base64 인코딩인지 확인
    if (!/^[A-Za-z0-9+/=]+$/.test(password)) {
        return res.status(400).json({
            code: 4000,
            message: '비밀번호는 Base64 인코딩 형식이어야 합니다',
        });
    }

    try {
        const result = await authController.login(
            res,
            sessionId,
            email,
            password,
        );
        return res.status(200).json(result);
    } catch (errorResponse) {
        res.status(200).json(errorResponse);
    }
});

// 로그아웃
authRouter.post('/logout', (req, res) => {
    const sessionId = req.cookies.session_id;

    if (sessionId === undefined) {
        return res
            .status(401)
            .json({ code: 4001, message: '인증이 필요합니다.', data: null });
    }

    authController.logout(res, sessionId);
});

// 회원 탈퇴
authRouter.delete('/withdrawal', (req, res) => {
    const sessionId = req.cookies.session_id;

    if (sessionId === undefined) {
        return res
            .status(401)
            .json({ code: 4001, message: '인증이 필요합니다.', data: null });
    }

    try {
        const userId = getLoggedInUser(sessionId).id;

        authController.withdraw(res, sessionId, userId);
    } catch (errorResponse) {
        res.status(200).json(errorResponse);
    }
});

export default authRouter;
