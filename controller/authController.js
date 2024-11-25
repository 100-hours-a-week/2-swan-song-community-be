import 'express-async-errors';
import bcrypt from 'bcryptjs';

import { User } from '../model/user.js';

import { userDao } from '../dao/userDaos.js';
import { postDao } from '../dao/postDaos.js';
import { commentDao } from '../dao/commentDaos.js';
import { viewHistoryDao } from '../dao/viewHistoryDaos.js';
import { postLikeDao } from '../dao/postLikeDaos.js';
import { postController } from './postController.js';

import {
    addSession,
    isLoggedIn,
    removeSession,
    removeSessionByUserId,
} from '../module/authUtils.js';
import { deleteImage, saveImage } from '../module/imageUtils.js';

class AuthController {
    async register(email, password, nickname, profileImage) {
        if (userDao.findByEmail(email)) {
            if (profileImage) deleteImage(profileImage.path);

            throw {
                code: 4009,
                message: '이미 가입된 이메일입니다',
                data: null,
            };
        }

        if (userDao.findByNickname(nickname)) {
            if (profileImage) deleteImage(profileImage.path);
            throw {
                code: 4009,
                message: '닉네임이 중복되었습니다',
                data: null,
            };
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const profileImageUrl = profileImage
            ? await saveImage(profileImage)
            : null;

        const newUser = new User(
            email,
            nickname,
            hashedPassword,
            profileImageUrl,
        );
        userDao.createUser(newUser);

        return {
            code: 2001,
            message: '회원가입 성공',
            data: { userId: newUser.id },
        };
    }

    checkNicknameAvailability(nickname) {
        if (userDao.findUserByNickname(nickname) !== undefined) {
            throw {
                code: 4009,
                message: '닉네임이 중복되었습니다.',
                data: { isAvailable: false },
            };
        }
        return {
            code: 2000,
            message: '사용 가능한 닉네임입니다',
            data: { isAvailable: true },
        };
    }

    async login(res, cookieSessionId, email, password) {
        // 해당 사용자가 존재하는지, 비밀번호가 일치하는지 확인
        const user = await userDao.findByEmail(email);
        if (!user || !(await bcrypt.compare(password, user.password))) {
            throw { code: 4001, message: '인증이 필요합니다.' };
        }

        // 기존 세션에 저장된 로그인 기록 제거
        const existingSession = isLoggedIn(cookieSessionId);
        if (existingSession && existingSession.id === user.id) {
            removeSession(cookieSessionId);
        }
        removeSessionByUserId(user.id);

        const sessionId = addSession(user);
        res.cookie('session_id', sessionId);

        // 로그인 성공 시 세션에 사용자 정보 저장 (비밀번호 제외)
        return {
            code: 2000,
            message: '로그인 성공',
            data: { userId: user.id },
        };
    }

    async logout(res, sessionId) {
        removeSession(sessionId);
        res.clearCookie('session_id');
        res.status(204).end();
    }

    async withdraw(res, sessionId, userId) {
        try {
            const posts = postDao.findAllByUserId(userId);
            posts.forEach(post => {
                postController.deletePost(post.id);
            });
            commentDao.deleteCommentsByUserId(userId);
            postLikeDao.deleteAllByUserId(userId);
            viewHistoryDao.deleteViewHistoriesByUserId(userId);

            const user = userDao.findById(userId);

            userDao.deleteUser(user);

            if (user.profileImageUrl) {
                deleteImage(user.profileImageUrl);
            }

            removeSession(sessionId);
            res.clearCookie('session_id');
            res.status(204).end();
        } catch (errorResponse) {
            throw errorResponse;
        }
    }
}

export const authController = new AuthController();
