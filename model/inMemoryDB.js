import { readFileSync, writeFileSync } from 'fs';

export const userJsonFilename = "./data/userStorage.json"
export const postJsonFilename = "./data/postStorage.json"
export const commentJsonFilename = "./data/commentStorage.json"
export const likeJsonFilename = "./data/likeStorage.json"
export const viewHistoryJsonFilename = "./data/viewHistoryStorage.json"

export const users = load(userJsonFilename);
export const posts = load(postJsonFilename);
export const comments = load(commentJsonFilename);
export const likes = load(likeJsonFilename);
export const viewHistories = load(viewHistoryJsonFilename);

export const userIdStorageFilename = "./data/userIdStorage.json"
export const postIdStorageFilename = "./data/postIdStorage.json"
export const commentIdStorageFilename = "./data/commentIdStorage.json"
export const likeIdStorageFilename = "./data/likeIdStorage.json"
export const viewHistoryIdStorageFilename = "./data/viewHistoryIdStorage.json"

export const userIdStorage = load(userIdStorageFilename);
export const postIdStorage = load(postIdStorageFilename);
export const commentIdStorage = load(commentIdStorageFilename);
export const likeIdStorage = load(likeIdStorageFilename);
export const viewHistoryIdStorage = load(viewHistoryIdStorageFilename);

function load(filename) {
    const jsonFile = readFileSync(filename);
    return JSON.parse(jsonFile);
}

export function flush(filename, inMemoryStorage) {
    const inMemoryStorageJson = JSON.stringify(inMemoryStorage)
    writeFileSync(filename, inMemoryStorageJson, 'utf-8')
}

