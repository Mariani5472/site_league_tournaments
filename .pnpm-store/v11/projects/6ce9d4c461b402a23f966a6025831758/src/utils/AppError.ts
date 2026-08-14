export type ApiErrorCode =
    | "BAD_REQUEST"
    | "UNAUTHENTICATED"
    | "FORBIDDEN"
    | "NOT_FOUND"
    | "CONFLICT"
    | "SERVICE_UNAVAILABLE";

export type AppErrorStatus = 400 | 401 | 403 | 404 | 409 | 503;

const defaultCodeByStatus: Record<AppErrorStatus, ApiErrorCode> = {
    400: "BAD_REQUEST",
    401: "UNAUTHENTICATED",
    403: "FORBIDDEN",
    404: "NOT_FOUND",
    409: "CONFLICT",
    503: "SERVICE_UNAVAILABLE"
};

export class AppError extends Error {
    public readonly statusCode: number;
    public readonly code: ApiErrorCode;

    constructor(message: string, statusCode: AppErrorStatus, code?: ApiErrorCode) {
        super(message);
        this.name = "AppError";
        this.statusCode = statusCode;
        this.code = code ?? defaultCodeByStatus[statusCode];
        Error.captureStackTrace?.(this, this.constructor);
    }
}
