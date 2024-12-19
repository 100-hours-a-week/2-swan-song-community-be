import 'express-async-errors';
import bcrypt from 'bcryptjs';

// DTO
import { ApiResponse } from '../dto/apiResponse.js';
import { ErrorResponse } from '../dto/errorResponse.js';

// DAO
import { userDao } from '../dao/userDaos.js';

import { saveImage, deleteImage } from '../utils/imageUtils.js';
import { formatDateTime } from '../utils/dateTimeUtils.js';

class UserController {
    constructor(userDao) {
        this.userDao = userDao;
    }

    findUserInfo(userId) {
        const user = this.userDao.findById(userId);

        const data = {
            userId: user.id,
            email: user.email,
            nickname: user.nickname,
            profileImageUrl: user.profileImageUrl,
            createdDateTime: formatDateTime(user.createdDateTime),
        };
        return new ApiResponse(200, 2000, '사용자 정보 조회 성공', data);
    }

    async updateUser(userId, updateUserDto) {
        const { nickname, isProfileImageRemoved, profileImage } = updateUserDto;

        const user = this.userDao.findById(userId);

        if (
            user.nickname !== nickname &&
            this.userDao.findByNickname(nickname)
        ) {
            throw new ErrorResponse(
                200,
                4009,
                '이미 사용 중인 닉네임입니다',
                null,
            );
        }

        let profileImageUrl = user.profileImageUrl;
        if (isProfileImageRemoved && user.profileImageUrl) {
            deleteImage(user.profileImageUrl);
            profileImageUrl = null;
        }

        if (profileImage) {
            profileImageUrl = await saveImage(profileImage);
        }

        const updatedUserDto = {
            nickname: nickname || user.nickname,
            profileImageUrl: profileImageUrl,
        };

        this.userDao.updateUser(userId, updatedUserDto);

        const data = {
            id: userId,
            name: nickname,
            profileImageUrl: profileImageUrl,
        };

        return new ApiResponse(200, 2000, '사용자 정보 수정 성공', data);
    }

    async updateUserPassword(userId, updateUserPasswordDto) {
        const { newPassword, passwordCheck } = updateUserPasswordDto;

        if (newPassword !== passwordCheck) {
            throw new ErrorResponse(
                200,
                4000,
                '비밀번호가 일치하지 않습니다',
                null,
            );
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        this.userDao.updateUserPassword(userId, hashedPassword);

        const data = {
            userId: userId,
        };

        return new ApiResponse(200, 2000, '비밀번호 수정 성공', data);
    }
}

export const userController = new UserController(userDao);
