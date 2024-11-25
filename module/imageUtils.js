const IMAGE_PATH = 'public/images/';

import 'express-async-errors';
import fs from 'fs';
import path from 'path';

// 이미지 삭제
export const deleteImage = async imagePath => {
    const imageFullPath = imagePath.startsWith('public')
        ? imagePath
        : path.join('public', imagePath);

    try {
        await fs.promises.unlink(imageFullPath);
    } catch (err) {
        console.error(`이미지 삭제 중 오류 발생: ${err.message}`);
    }
};

export const saveImage = async image => {
    if (!image || !image.path || !image.filename) {
        throw new Error('유효하지 않은 파일입니다.');
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
        console.error(`이미지 저장 중 오류 발생: ${error.message}`);
    } finally {
        // 임시 파일 제거
        try {
            await fs.promises.unlink(tempPath);
        } catch (error) {
            console.error(`임시 파일 제거 중 오류 발생: ${error.message}`);
        }
    }
};
