export class ErrorWrapper {
    constructor(httpStatus, errorCode, message, data) {
        this.httpStatus = httpStatus;
        this.errorResponse = {
            code: errorCode,
            message: message,
            data: data,
        };
    }
}
