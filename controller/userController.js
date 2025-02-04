import 'express-async-errors';
import bcrypt from 'bcryptjs';

// DTO
import { ApiResponse } from '../dto/apiResponse.js';
import { ErrorResponse } from '../dto/errorResponse.js';

// DAO
import { userDao } from '../dao/userDaos.js';

import {
    saveImage,
    getPreSignedUrl,
    deleteImage,
} from '../utils/imageUtils.js';
import { formatDateTime } from '../utils/dateTimeUtils.js';

class UserController {
    constructor(userDao) {
        this.userDao = userDao;
    }

    async findUserInfo(conn, userId) {
        const user = await this.userDao.findById(conn, userId);

        const data = {
            userId: user.id,
            email: user.email,
            nickname: user.nickname,
            profileImageUrl:
                user.profileImageKey &&
                (await getPreSignedUrl(user.profileImageKey)),
            createdDateTime: formatDateTime(user.createdDateTime),
        };
        return new ApiResponse(200, 2000, '사용자 정보 조회 성공', data);
    }

    async updateUser(conn, userId, updateUserDto) {
        const { nickname, isProfileImageRemoved, profileImage } = updateUserDto;

        const user = await this.userDao.findById(conn, userId);

        if (user.nickname === nickname) {
            throw new ErrorResponse(
                200,
                4009,
                '기존 닉네임과 동일합니다',
                null,
            );
        }

        if (
            user.nickname !== nickname &&
            (await this.userDao.findByNickname(conn, nickname))
        ) {
            throw new ErrorResponse(
                200,
                4009,
                '이미 사용 중인 닉네임입니다',
                null,
            );
        }

        let profileImageKey = user.profileImageKey;
        if (isProfileImageRemoved && user.profileImageKey) {
            deleteImage(user.profileImageKey);
            profileImageKey = null;
        }

        let preSignedUrl = null;
        if (profileImage) {
            const { s3Key: newS3Key, preSignedUrl: newPreSignedUrl } =
                await saveImage(profileImage);
            profileImageKey = newS3Key;
            preSignedUrl = newPreSignedUrl;
        } else if (profileImageKey) {
            preSignedUrl = await getPreSignedUrl(profileImageKey);
        }

        const updatedUserDto = {
            nickname: nickname || user.nickname,
            profileImageKey: profileImageKey,
        };

        await this.userDao.updateUser(conn, userId, updatedUserDto);

        const data = {
            id: userId,
            name: nickname || user.nickname,
            profileImageUrl: preSignedUrl,
        };

        return new ApiResponse(200, 2000, '사용자 정보 수정 성공', data);
    }

    async updateUserPassword(conn, userId, updateUserPasswordDto) {
        const { currentPassword, newPassword, passwordCheck } =
            updateUserPasswordDto;

        if (newPassword !== passwordCheck) {
            throw new ErrorResponse(
                200,
                4000,
                '비밀번호가 일치하지 않습니다',
                null,
            );
        }

        const currentPasswordInDB = (await this.userDao.findById(conn, userId))
            .password;

        if (!(await bcrypt.compare(currentPassword, currentPasswordInDB))) {
            throw new ErrorResponse(
                200,
                4003,
                '현재 비밀번호가 일치하지 않습니다.',
            );
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        if (await bcrypt.compare(newPassword, currentPasswordInDB)) {
            throw new ErrorResponse(200, 4000, '현재 비밀번호와 달라야합니다.');
        }

        await this.userDao.updateUserPassword(conn, userId, hashedPassword);

        const data = {
            userId: userId,
        };

        return new ApiResponse(200, 2000, '비밀번호 수정 성공', data);
    }
}

export const userController = new UserController(userDao);
