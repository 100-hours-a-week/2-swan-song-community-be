import express from 'express';
import 'express-async-errors';
import fs from 'fs';
import https from 'https';

import './config/connect.js';
import './config/json.js';

import logger from './utils/logger.js';
import dotenv from 'dotenv';

import bodyParser from 'body-parser';

import staticRouter from './routes/staticRouter.js';
import authRouter from './routes/authRouter.js';
import userRouter from './routes/userRouter.js';
import postRouter from './routes/postRouter.js';
import cors from 'cors';
import multer from 'multer';

const app = express();
dotenv.config();

const port = process.env.PORT;
const env = process.env.NODE_ENV;

app.use(express.json());
app.use(bodyParser.json());

const healthRouter = express.Router();
healthRouter.get('/health', (req, res) => {
    res.status(200).json({ message: 'OK' });
});
app.use(healthRouter);

// CORS 설정: 3000 포트에서만 허용
const corsOptions = {
    origin: (origin, callback) => {
        callback(null, true);
    },
    allowedHeaders: ['Content-Type', 'Authorization', 'Set-Cookie'],
    credentials: true,
};
app.use(cors(corsOptions));

app.use(staticRouter);
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/posts', postRouter);

// 에러 핸들러
app.use((err, req, res, next) => {
    const query = JSON.stringify(req.query);
    const body = JSON.stringify(req.body);
    const headers = JSON.stringify(req.headers);

    logger.error(
        `${req.method} ${req.originalUrl} ${headers} ${query} ${body} - ${err?.errorResponse?.message} -${err?.message}`,
    );
    res.status(err.httpStatus || 500).json(
        err.errorResponse || {
            code: 5000,
            message: '서버 내 오류가 발생했습니다.',
            data: null,
        },
    );
    next();
});

app.listen(port, () => {
    logger.info(`${env} 서버가 ${port}번 포트에서 실행 중입니다.`);
});
