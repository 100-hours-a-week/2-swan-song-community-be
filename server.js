import express from 'express';
import 'express-async-errors';

import logger from './middlewares/logger.js';
import dotenv from 'dotenv';

import bodyParser from 'body-parser';

import staticRouter from './routes/staticRouter.js';
import authRouter from './routes/authRouter.js';
import userRouter from './routes/userRouter.js';
import postRouter from './routes/postRouter.js';
import cors from 'cors';

const app = express();
dotenv.config();

const port = process.env.PORT;
const env = process.env.NODE_ENV;

app.use(express.json());
app.use(bodyParser.json());

// CORS 설정: 3000 포트에서만 허용
const corsOptions = {
    origin: 'http://localhost:3000',
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
        `${req.method} ${req.originalUrl} ${headers} ${query} ${body} - ${err.errorResponse.message}`,
    );
    res.status(err.httpStatus || 500).json(
        err.errorResponse || {
            code: 5000,
            message: '현재 처리가 어렵습니다.',
            data: null,
        },
    );
    next();
});

app.listen(port, () => {
    logger.info(`${env} 서버가 ${port}번 포트에서 실행 중입니다.`);
});
