export const POLICY = 'fixed-5day-v3';
export class ServiceError extends Error {
    code;
    constructor(code, message) {
        super(message);
        this.code = code;
        this.name = 'ServiceError';
    }
}
