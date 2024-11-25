import { generateUserId } from './inMemoryDB.js';

export class User {
    constructor(email, nickname, password, profileImageUrl) {
        this.id = generateUserId();
        this.email = email;
        this.nickname = nickname;
        this.password = password;
        this.profileImageUrl = profileImageUrl;
        this.createdDateTime = new Date();
    }
}
