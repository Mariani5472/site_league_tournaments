export class ApiError extends Error {
    readonly status?: number;
    readonly code?: string;

    constructor(message: string, status?: number, code?: string) {
        super(message);
        this.name = "ApiError";
        this.status = status;
        this.code = code;
    }
}

export function mutationErrorMessage(error: unknown) {
    if (error instanceof ApiError) {
        switch (error.status) {
            case 403:
                return "You do not have permission to perform this action.";
            case 404:
                return "The requested resource was not found.";
            case 409:
                return error.message || "This action conflicts with the current state. Refresh and try again.";
            default:
                if (error.status && error.status >= 500) {
                    return "An unexpected server error occurred. Please try again.";
                }
        }
    }

    return error instanceof Error && error.message
        ? error.message
        : "The request could not be completed.";
}
