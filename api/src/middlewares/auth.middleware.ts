import { Request, Response, NextFunction } from "express";
import { supabase } from "../lib/supabase";
import { AppError } from "../utils/AppError";
import { UserIdentity } from "../modules/users/users.types";

export type HttpAuthenticator = (token: string) => Promise<UserIdentity>;

const authenticateWithSupabase: HttpAuthenticator = async token => {
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user) {
        throw new AppError("Invalid token", 401);
    }
    if (!data.user.email) {
        throw new AppError("Authenticated user has no email", 401);
    }
    return { id: data.user.id, email: data.user.email };
};

let authenticate: HttpAuthenticator = authenticateWithSupabase;

export function setHttpAuthenticatorForTests(authenticator: HttpAuthenticator) {
    if (process.env.NODE_ENV !== "test") {
        throw new Error("HTTP authenticator can only be replaced in tests");
    }
    authenticate = authenticator;
}

export async function authMiddleware(request: Request, response: Response, next: NextFunction) {
    const authHeader = request.headers.authorization;
    if (!authHeader)
        throw new AppError("Token missing", 401);
    const [scheme, token] = authHeader.split(" ");
    if (scheme !== "Bearer" || !token)
        throw new AppError("Invalid authorization header", 401);
    request.user = await authenticate(token);
    return next();
}
