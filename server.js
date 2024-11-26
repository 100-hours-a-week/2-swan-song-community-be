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
    console.error(err.stack);
    res.status(500).json({
        code: 5000,
        message: '요청을 처리할 수 없습니다.',
        data: null,
    });
});

app.listen(port, () => {
    logger.info(`${env} 서버가 ${port}번 포트에서 실행 중입니다.`);
});
