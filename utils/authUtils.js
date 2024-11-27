import { userDao } from '../dao/userDaos.js';

const sessions = {}; // 로그인 세션을 저장

// 로그인 세션 추가
export function addSession(user) {
    const sessionId = Math.random().toString(36).substr(2, 10);
    const { password, ...userWithoutPassword } = user;
    sessions[sessionId] = userWithoutPassword;
    return sessionId;
}

// 로그인 세션 제거
export function removeSession(sessionId) {
    delete sessions[sessionId];
}

// 특정 회원 로그인 세션 제거
export function removeSessionByUserId(userId) {
    for (const sessionId in sessions) {
        if (sessions[sessionId].id === userId) {
            delete sessions[sessionId];
            break;
        }
    }
}

// 로그인 세션 조회 (회원을 두 저장소에서 다루니 동기화 문제 발생. 참조만 사용해 해결)
export function getLoggedInUser(sessionId) {
    return userDao.findById(sessions[sessionId].id);
}

// 로그인 여부 확인
export function isLoggedIn(sessionId) {
    return !!sessions[sessionId];
}
