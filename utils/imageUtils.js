import 'express-async-errors';
import fs from 'fs';
import path from 'path';

import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

import logger from './logger.js';

import { ErrorResponse } from '../dto/errorResponse.js';

const BUCKET_NAME = process.env.BUCKET_NAME;

const s3Client = new S3Client({profile: "param"});

export const saveImage = async image => {
    if (!image || !image.path || !image.filename) {
        throw new ErrorResponse(400, 4000, '유효하지 않은 파일입니다', null);
    }

    const { path: tempPath, filename, mimetype } = image;
    const fileExtension = mimetype.split('/')[1];
    const s3Key = `${filename}.${fileExtension}`; // S3에서의 파일 경로

    try {
        // 파일을 읽어서 S3로 업로드
        const fileStream = fs.createReadStream(tempPath);

        const uploadParams = {
            Bucket: BUCKET_NAME,
            Key: s3Key,
            Body: fileStream,
            ContentType: mimetype,
        };

        await s3Client.send(new PutObjectCommand(uploadParams));

        // Pre-signed URL 생성 (다운로드용)
        const command = new GetObjectCommand({
            Bucket: BUCKET_NAME,
            Key: s3Key,
        });

        const preSignedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 }); // 1시간 유효
        return { s3Key, preSignedUrl };
    } catch (error) {
        logger.error(`이미지 업로드 중 오류 발생: ${error.message}`);
        throw new ErrorResponse(500, 5000, '이미지 업로드 중 오류 발생', null);
    } finally {
        // 임시 파일 제거
        try {
            logger.info(`임시 파일 제거: ${tempPath}`);
            await fs.promises.unlink(tempPath);
        } catch (error) {
            logger.error(`임시 파일 제거 중 오류 발생: ${error.message}`);
        }
    }
};

export const getPreSignedUrl = async s3Key => {
    const command = new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: s3Key,
    });

    return await getSignedUrl(s3Client, command, { expiresIn: 3600 }); // 1시간 유효
};

// 이미지 삭제
export const deleteImage = async imagePath => {
    const imageFullPath = imagePath.startsWith('public')
        ? imagePath
        : path.join('public', imagePath);

    try {
        await fs.promises.unlink(imageFullPath);
    } catch (err) {
        logger.Error(`이미지 삭제 중 오류 발생: ${err.message}`);
        throw new ErrorResponse(500, 5000, '이미지 삭제 중 오류 발생', null);
    }
};

