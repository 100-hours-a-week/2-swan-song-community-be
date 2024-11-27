export class ApiResponse {
    // httpStatus 가 204 인 경우 businessCode, message, data 는 필요 없음
    constructor(httpStatus, businessCode, message, data) {
        this.httpStatus = httpStatus;
        this.code = businessCode || null;
        this.message = message || null;
        this.data = data || null;
    }

    resolve(res) {
        if (this.httpStatus === 204) {
            return res.status(this.httpStatus).end();
        }
        res.status(this.httpStatus).json({
            code: this.code,
            message: this.message,
            data: this.data,
        });
    }
}
