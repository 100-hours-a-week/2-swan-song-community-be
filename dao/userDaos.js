import { users, userJsonFilename, flush } from '../model/inMemoryDB.js';
import { binarySearch } from '../dao/algorithm.js';

import { ErrorResponse } from '../dto/errorResponse.js';

class IUserDao {
    constructor() {
        if (this.constructor === IUserDao) {
            throw new Error("'IUserDAO'는 객체를 생성할 수 없습니다.");
        }
    }

    findById(userId) {
        throw new Error('구현되지 않은 메소드입니다.');
    }

    findByEmail(email) {
        throw new Error('구현되지 않은 메소드입니다.');
    }

    findByNickname(nickname) {
        throw new Error('구현되지 않은 메소드입니다.');
    }

    createUser(user) {
        throw new Error('구현되지 않은 메소드입니다.');
    }

    updateUser(userId, updatedUserDto) {
        throw new Error('구현되지 않은 메소드입니다.');
    }

    updateUserPassword(userId, hashedPassword) {
        throw new Error('구현되지 않은 메소드입니다.');
    }

    deleteUser(userId) {
        throw new Error('구현되지 않은 메소드입니다.');
    }
}

class InMemoryUserDao extends IUserDao {
    constructor(users) {
        super();
        this.users = users;
    }

    findById(userId) {
        const userIdx = binarySearch(this.users, userId);

        if (userIdx === -1) {
            throw new ErrorResponse(
                200,
                4004,
                '사용자를 찾을 수 없습니다',
                null,
            );
        }

        return this.users[userIdx];
    }

    // NOTE: ID 는 정렬되어있어 binary search 가 유효하지만 email, nickname 은 정렬되어있지 않아 binary search 가 불가능합니다.
    findByEmail(email) {
        const user = this.users.find(user => user.email === email);
        return user;
    }

    findByNickname(nickname) {
        return this.users.find(user => user.nickname === nickname);
    }

    createUser(user) {
        this.users.push(user);
        flush(userJsonFilename, this.users);
    }

    updateUser(userId, updatedUserDto) {
        const user = this.findById(userId);

        user.nickname = updatedUserDto.nickname;
        user.profileImageKey = updatedUserDto.profileImageKey;
        flush(userJsonFilename, this.users);
    }

    updateUserPassword(userId, hashedPassword) {
        const user = this.findById(userId);
        user.password = hashedPassword;
        flush(userJsonFilename, this.users);
    }

    deleteUser(user) {
        const userIdx = this.users.indexOf(user);
        this.users.splice(userIdx, 1);
        flush(userJsonFilename, this.users);
    }
}

class MariaDbUserDao extends IUserDao {
    async findById(conn, userId) {
        const rows = await conn.query('SELECT * FROM user WHERE id = ?', [
            userId,
        ]);

        if (rows.length === 0) {
            throw new ErrorResponse(
                200,
                4004,
                '사용자를 찾을 수 없습니다',
                null,
            );
        }

        return rows[0];
    }

    async findByEmail(conn, email) {
        const rows = await conn.query('SELECT * FROM user WHERE email = ?', [
            email,
        ]);

        return rows[0] || null;
    }

    async findByNickname(conn, nickname) {
        const rows = await conn.query('SELECT * FROM user WHERE nickname = ?', [
            nickname,
        ]);

        return rows[0] || null;
    }

    async createUser(conn, user) {
        const { email, nickname, password, profileImageKey } = user;
        const result = await conn.query(
            'INSERT INTO user (email, nickname, password, profileImageKey) VALUES (?, ?, ?, ?)',
            [email, nickname, password, profileImageKey],
        );
        return result.insertId;
    }

    async updateUser(conn, userId, updatedUserDto) {
        const { nickname, profileImageKey } = updatedUserDto;
        await conn.query(
            'UPDATE user SET nickname = ?, profileImageKey = ? WHERE id = ?',
            [nickname, profileImageKey, userId],
        );
    }

    async updateUserPassword(conn, userId, hashedPassword) {
        await conn.query('UPDATE user SET password = ? WHERE id = ?', [
            hashedPassword,
            userId,
        ]);
    }

    async deleteUser(conn, user) {
        await conn.query('DELETE FROM user WHERE id = ?', [user.id]);
    }
}

export const userDao = new MariaDbUserDao();
