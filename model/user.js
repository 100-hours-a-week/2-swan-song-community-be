import { userIdStorageFilename, userIdStorage, flush } from "./inMemoryDB.js";

export class User {
    constructor(email, nickname, password, profileImageUrl) {
        this.id = userIdStorage.userId++;
        this.email = email;
        this.nickname = nickname;
        this.password = password;
        this.profileImageUrl = profileImageUrl;
        this.createdDateTime = new Date();
        flush(userIdStorageFilename, userIdStorage);
    }
}
