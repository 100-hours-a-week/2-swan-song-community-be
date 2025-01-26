// 파일 필터링: MIME 타입과 파일 내용을 검증
import multer from 'multer';
import { ErrorResponse } from '../dto/errorResponse.js';
import sharp from 'sharp';

const fileFilter = async (req, file, cb) => {
    if (!file) {
        cb(null, true);
        return;
    }

    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];

    // MIME 타입만 확인
    if (!allowedMimeTypes.includes(file.mimetype)) {
        return cb(new ErrorResponse(200, 4000, '유효한 이미지 파일이 아닙니다.'), false);
    }

    cb(null, true);
};

// Multer 설정
export const multipartImageProcessor = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB 제한
    fileFilter: fileFilter,
});

// SVG 파일 검증 함수
const validateSvgContent = (buffer) => {
    const content = buffer.toString('utf8'); // 버퍼를 문자열로 변환
    // SVG 파일의 시작 부분에 `<svg` 태그가 있어야 유효
    if (!content.trim().startsWith('<svg')) {
        throw new ErrorResponse(200, 4000, '유효하지 않은 SVG 파일입니다.');
    }
    // 추가로 불필요한 스크립트 태그 등을 확인 가능 (보안 목적)
    if (content.includes('<script')) {
        throw new ErrorResponse(200, 4000, 'SVG 파일에 스크립트 태그가 포함되어 있습니다.');
    }
};

// 일반 이미지 파일 검증 함수
const validateImageContent = async (file) => {
    const metadata = await sharp(file.buffer).metadata();
    if (!['jpeg', 'png', 'gif', 'webp'].includes(metadata.format)) {
        throw new ErrorResponse(200, 4000, '지원하지 않는 이미지 포맷입니다.');
    }
};

// 파일 내용 검증 함수
export const validateAndReturnExactImageContent = async (file) => {
    if (!file) {
        return null;
    }

    if (file.mimetype === 'image/svg+xml') {
        validateSvgContent(file.buffer);
    } else {
        await validateImageContent(file);
    }

    return file;
};
