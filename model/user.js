export class User {
    constructor(email, nickname, password, profileImageUrl) {
        this.id = 0;
        this.email = email;
        this.nickname = nickname;
        this.password = password;
        this.profileImageUrl = profileImageUrl;
        this.createdDateTime = null;
    }
}
