import 'express-async-errors';
import bcrypt from 'bcryptjs';

// DTO
import { ApiResponse } from '../dto/apiResponse.js';
import { ErrorResponse } from '../dto/errorResponse.js';

// DAO
import { userDao } from '../dao/userDaos.js';
import { postDao } from '../dao/postDaos.js';
import { commentDao } from '../dao/commentDaos.js';
import { viewHistoryDao } from '../dao/viewHistoryDaos.js';
import { postLikeDao } from '../dao/postLikeDaos.js';
import { postController } from './postController.js';

// Data Model
import { User } from '../model/user.js';

import {
    addSession,
    isLoggedIn,
    removeSession,
    removeSessionByUserId,
} from '../utils/authUtils.js';

import { deleteImage, saveImage } from '../utils/imageUtils.js';

class AuthController {
    async register(email, password, nickname, profileImage) {
        if (userDao.findByEmail(email)) {
            if (profileImage) deleteImage(profileImage.path);
            throw new ErrorResponse(
                200,
                4009,
                '이미 가입된 이메일입니다',
                null,
            );
        }

        if (userDao.findByNickname(nickname)) {
            if (profileImage) deleteImage(profileImage.path);
            throw new ErrorResponse(200, 4009, '닉네임이 중복되었습니다', null);
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

        const data = { userId: newUser.id };
        return new ApiResponse(200, 2001, '회원가입 성공', data);
    }

    checkNicknameAvailability(nickname) {
        if (userDao.findByNickname(nickname) !== undefined) {
            throw new ErrorResponse(200, 4009, '닉네임이 중복되었습니다', {
                isAvailable: false,
            });
        }

        const data = { isAvailable: true };
        return new ApiResponse(200, 2000, '사용 가능한 닉네임입니다', data);
    }

    async login(res, sessionIdToRemove, email, password) {
        // 해당 사용자가 존재하는지, 비밀번호가 일치하는지 확인
        const user = await userDao.findByEmail(email);
        if (!user || !(await bcrypt.compare(password, user.password))) {
            throw new ErrorResponse(200, 4001, '인증이 필요합니다.', null);
        }

        // 기존 세션에 저장된 로그인 기록 제거
        const existingSession = isLoggedIn(sessionIdToRemove);
        if (existingSession && existingSession.id === user.id) {
            removeSession(sessionIdToRemove);
        }
        removeSessionByUserId(user.id);

        const sessionId = addSession(user);
        const sessionOptions = {
            maxAge: 1000 * 60 * 60 * 24 * 7, // 7일
            sameSite: 'Strict',
            secure: false,
        };

        res.cookie('session_id', sessionId, sessionOptions);

        const data = { userId: user.id };
        return new ApiResponse(200, 2000, '로그인 성공', data);
    }

    logout(res, sessionId) {
        removeSession(sessionId);
        res.clearCookie('session_id');

        return new ApiResponse(204);
    }

    async withdraw(res, sessionId, userId) {
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

        return new ApiResponse(204);
    }
}

export const authController = new AuthController();
