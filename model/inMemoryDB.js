import { readFileSync, writeFileSync } from 'fs';

export const userJsonFilename = './data/userStorage.json';
export const postJsonFilename = './data/postStorage.json';
export const commentJsonFilename = './data/commentStorage.json';
export const likeJsonFilename = './data/likeStorage.json';
export const viewHistoryJsonFilename = './data/viewHistoryStorage.json';

export const users = load(userJsonFilename);
export const posts = load(postJsonFilename);
export const comments = load(commentJsonFilename);
export const likes = load(likeJsonFilename);
export const viewHistories = load(viewHistoryJsonFilename);

const userIdStorageFilename = './data/userIdStorage.json';
const postIdStorageFilename = './data/postIdStorage.json';
const commentIdStorageFilename = './data/commentIdStorage.json';
const likeIdStorageFilename = './data/likeIdStorage.json';
const viewHistoryIdStorageFilename = './data/viewHistoryIdStorage.json';

const userIdStorage = load(userIdStorageFilename);
const postIdStorage = load(postIdStorageFilename);
const commentIdStorage = load(commentIdStorageFilename);
const likeIdStorage = load(likeIdStorageFilename);
const viewHistoryIdStorage = load(viewHistoryIdStorageFilename);

// 락을 걸지 않아 동시성 이슈 발생 가능. 당장 중요한 부분은 아니기에 DB 도입으로 해결할 예정
export const generateUserId = () => {
    userIdStorage.id += 1;
    flush(userIdStorageFilename, userIdStorage);
    return userIdStorage.id;
};

export const generatePostId = () => {
    postIdStorage.id += 1;
    flush(postIdStorageFilename, postIdStorage);
    return postIdStorage.id;
};

export const generateCommentId = () => {
    commentIdStorage.id += 1;
    flush(commentIdStorageFilename, commentIdStorage);
    return commentIdStorage.id;
};

export const generateLikeId = () => {
    likeIdStorage.id += 1;
    flush(likeIdStorageFilename, likeIdStorage);
    return likeIdStorage.id;
};

export const generateViewHistoryId = () => {
    viewHistoryIdStorage.id += 1;
    flush(viewHistoryIdStorageFilename, viewHistoryIdStorage);
    return viewHistoryIdStorage.id;
};

function load(filename) {
    const jsonFile = readFileSync(filename);
    return JSON.parse(jsonFile);
}

export function flush(filename, inMemoryStorage) {
    const inMemoryStorageJson = JSON.stringify(inMemoryStorage);
    writeFileSync(filename, inMemoryStorageJson, 'utf-8');
}
