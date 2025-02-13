import { userDao } from '../dao/userDaos.js';
import { loginSessionDao } from '../dao/loginSessionDaos.js';

import { LoginSession } from '../model/loginSession.js';

// 로그인 세션 추가
export function addSession(conn, user) {
    const sessionId = Math.random().toString(36).substr(2, 10);
    const loginSession = new LoginSession(sessionId, user.id);
    loginSessionDao.createLoginSession(conn, loginSession);
    return sessionId;
}

// 로그인 세션 제거
export function removeSession(conn, sessionId) {
    loginSessionDao.deleteLoginSessionBySessionId(conn, sessionId);
}

// 특정 회원 로그인 세션 제거
export function removeSessionByUserId(conn, userId) {
    loginSessionDao.deleteAllByUserId(conn, userId);
}

// 로그인 세션 조회 (회원을 두 저장소에서 다루니 동기화 문제 발생. 참조만 사용해 해결)
export async function getLoggedInUser(conn, sessionId) {
    const session = await loginSessionDao.findBySessionId(conn, sessionId);
    return userDao.findById(conn, session.userId);
}

// 로그인 여부 확인
export function isLoggedIn(conn, sessionId) {
    return loginSessionDao.findBySessionId(conn, sessionId) !== undefined;
}
