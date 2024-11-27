const IMAGE_PATH = 'public/images/';

import 'express-async-errors';
import fs from 'fs';
import path from 'path';

import logger from './logger.js';

import { ErrorWrapper } from '../module/errorWrapper.js';

// 이미지 삭제
export const deleteImage = async imagePath => {
    const imageFullPath = imagePath.startsWith('public')
        ? imagePath
        : path.join('public', imagePath);

    try {
        await fs.promises.unlink(imageFullPath);
    } catch (err) {
        logger.Error(`이미지 삭제 중 오류 발생: ${err.message}`);
        throw new ErrorWrapper(500, 5000, '이미지 삭제 중 오류 발생', null);
    }
};

export const saveImage = async image => {
    if (!image || !image.path || !image.filename) {
        throw new ErrorWrapper(400, 4000, '유효하지 않은 파일입니다', null);
    }

    const { path: tempPath, filename, mimetype } = image;
    const fileExtension = mimetype.split('/')[1];
    const filePath = path.join(IMAGE_PATH, `${filename}.${fileExtension}`);

    try {
        // 이미지 파일 저장
        await fs.promises.copyFile(tempPath, filePath);

        // 저장된 파일 경로 반환
        return filePath.replace('public', '');
    } catch (error) {
        logger.Error(`이미지 저장 중 오류 발생: ${error.message}`);
        throw new ErrorWrapper(500, 5000, '이미지 저장 중 오류 발생', null);
    } finally {
        // 임시 파일 제거 (라우터에서 임시 파일을 제거하도록 변경해도 좋을 듯함)
        try {
            logger.info(`임시 파일 제거: ${tempPath}`);
            await fs.promises.unlink(tempPath);
        } catch (error) {
            logger.error(`임시 파일 제거 중 오류 발생: ${error.message}`);
        }
    }
};
