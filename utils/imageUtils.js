import 'express-async-errors';

import {
    S3Client,
    PutObjectCommand,
    GetObjectCommand,
    DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

import logger from './logger.js';

import { ErrorResponse } from '../dto/errorResponse.js';

import { v4 as uuidv4 } from 'uuid';

const BUCKET_NAME = process.env.BUCKET_NAME;

const s3Client = new S3Client();

export const saveImage = async image => {
    const s3Key = `${Date.now()}_${uuidv4()}.${image.mimetype.split('/')[1]}`;

    try {
        // 파일을 읽어서 S3로 업로드
        const uploadParams = {
            Bucket: BUCKET_NAME,
            Key: s3Key,
            Body: image.buffer,
            ContentType: image.mimetype,
        };

        await s3Client.send(new PutObjectCommand(uploadParams));

        // Pre-signed URL 생성 (다운로드용)
        const command = new GetObjectCommand({
            Bucket: BUCKET_NAME,
            Key: s3Key,
        });

        const preSignedUrl = await getSignedUrl(s3Client, command, {
            expiresIn: 3600,
        }); // 1시간 유효
        return { s3Key, preSignedUrl };
    } catch (error) {
        logger.error(`이미지 업로드 중 오류 발생: ${error.message}`);
        throw new ErrorResponse(500, 5000, '이미지 업로드 중 오류 발생', null);
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
    try {
        // S3 객체 삭제
        const command = new DeleteObjectCommand({
            Bucket: BUCKET_NAME,
            Key: imagePath,
        });

        await s3Client.send(command);
        logger.info(`이미지 삭제 성공: ${imagePath}`);
    } catch (err) {
        logger.error(`이미지 삭제 중 오류 발생: ${err.message}`);
        throw new ErrorResponse(500, 5000, '이미지 삭제 중 오류 발생', null);
    }
};
