export class User {
    constructor(email, nickname, password, profileImageKey) {
        this.id = 0;
        this.email = email;
        this.nickname = nickname;
        this.password = password;
        this.profileImageKey = profileImageKey;
        this.createdDateTime = null;
    }
}
