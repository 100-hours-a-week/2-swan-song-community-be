import rootPath from 'app-root-path';
import winston from 'winston';

import dotenv from 'dotenv';
dotenv.config();

const { combine, timestamp, label, printf } = winston.format;

const logFormat = printf(({ level, message, label, timestamp }) => {
    return `${timestamp} [${label}] ${level}: ${message}`;
});

const options = {
    // log파일
    file: {
        filename: `${rootPath}/logs/server.log`,
        handleExceptions: true,
        json: false,
        maxSize: 5242880, // 5MB
        maxFiles: 5,
        colorize: false,
        format: combine(label({ label: 'server' }), timestamp(), logFormat),
    },
    // 개발 시 console에 출력
    console: {
        level: 'debug',
        handleExceptions: true,
        json: false,
        colorize: true,
        format: combine(label({ label: 'express' }), timestamp(), logFormat),
    },
};

const logger = new winston.createLogger({
    transports: [new winston.transports.File(options.file)],
    exitOnError: false,
});

if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console(options.console));
}

export default logger;
