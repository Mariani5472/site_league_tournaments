const developmentOrigins = ["http://localhost:5173", "http://127.0.0.1:5173"];
export function allowedOrigins() {
    const configured = process.env.CORS_ORIGINS?.split(",").map(value => value.trim()).filter(Boolean);
    if (configured?.length)
        return configured;
    if (process.env.NODE_ENV === "production") {
        throw new Error("CORS_ORIGINS is required in production");
    }
    return developmentOrigins;
}
export const configuredOrigins = allowedOrigins();
export function corsOrigin(origin: string | undefined, callback: (error: Error | null, allowed?: boolean) => void) {
    if (!origin || configuredOrigins.includes(origin))
        return callback(null, true);
    callback(new AppError("Origin not allowed by CORS", 403));
}
import { AppError } from "../utils/AppError";
