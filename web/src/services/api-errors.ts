import { t } from "@/i18n";

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
        const byCode: Partial<Record<string, ReturnType<typeof t>>> = {
            UNAUTHORIZED: t("error.unauthorized"),
            FORBIDDEN: t("error.forbidden"),
            NOT_FOUND: t("error.notFound"),
            CONFLICT: t("error.conflict"),
            VALIDATION_ERROR: t("error.validation"),
            BAD_REQUEST: t("error.validation"),
            RATE_LIMITED: t("error.rateLimit"),
            INTERNAL_ERROR: t("error.server"),
        };
        if (error.code && byCode[error.code]) return byCode[error.code];
        switch (error.status) {
            case 403:
                return t("error.forbidden");
            case 404:
                return t("error.notFound");
            case 409:
                return t("error.conflict");
            default:
                if (error.status && error.status >= 500) {
                    return t("error.server");
                }
        }
    }

    return t("error.generic");
}

export function authErrorMessage(error: unknown, fallback: "initialize" | "signIn" | "signUp") {
    const code = typeof error === "object" && error && "code" in error ? String(error.code) : "";
    const keys = {
        invalid_credentials: "auth.error.credentials",
        email_not_confirmed: "auth.error.confirmEmail",
        user_already_exists: "auth.error.accountExists",
        weak_password: "auth.error.weakPassword",
    } as const;
    return code in keys
        ? t(keys[code as keyof typeof keys])
        : t(`auth.error.${fallback}` as "auth.error.initialize" | "auth.error.signIn" | "auth.error.signUp");
}
