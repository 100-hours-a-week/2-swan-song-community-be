import 'express-async-errors';
import bcrypt from 'bcryptjs';

import { ErrorWrapper } from '../module/errorWrapper.js';

import { userDao } from '../dao/userDaos.js';

import { saveImage, deleteImage } from '../module/imageUtils.js';

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
            createdDateTime: user.createdDateTime,
        };

        return {
            code: 2000,
            message: '사용자 정보 조회 성공',
            data: data,
        };
    }

    async updateUser(userId, updateUserDto) {
        const { nickname, isProfileImageRemoved, profileImage } = updateUserDto;

        const user = this.userDao.findById(userId);

        if (
            user.nickname !== nickname &&
            this.userDao.findByNickname(nickname)
        ) {
            throw new ErrorWrapper(200, 4009, '이미 사용 중인 닉네임입니다', null);
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
            userId: user.id,
        };

        return {
            code: 2000,
            message: '사용자 정보 수정 성공',
            data: data,
        };
    }

    async updateUserPassword(userId, updateUserPasswordDto) {
        const { newPassword, passwordCheck } = updateUserPasswordDto;

        if (newPassword !== passwordCheck) {
            throw new ErrorWrapper(
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

        return {
            code: 2000,
            message: '비밀번호 수정 성공',
            data: data,
        };
    }
}

export const userController = new UserController(userDao);
