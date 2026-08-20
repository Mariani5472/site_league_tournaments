import { Request, Response, NextFunction } from "express";
import { supabase } from "../lib/supabase";
import { AppError } from "../utils/AppError";
import { UserIdentity } from "../modules/users/users.types";
import { enrichObservabilityContext } from "../observability/context";
import { enforceHttpUserRateLimit } from "../rate-limit/http-rate-limit";
import { assertUserOperationalAccess } from "../security/user-operational-access";

export type HttpAuthenticator = (token: string) => Promise<UserIdentity>;

const authenticateWithSupabase: HttpAuthenticator = async token => {
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user) {
        throw new AppError("Invalid token", 401);
    }
    if (!data.user.email) {
        throw new AppError("Authenticated user has no email", 401);
    }
    let claims: {
        aal?: unknown;
        amr?: Array<{ method?: unknown; timestamp?: unknown }>;
        sub?: unknown;
    } = {};
    try {
        const payload = token.split(".")[1];
        if (payload) claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    } catch {
        // The token was already validated by Supabase; missing optional claims deny sensitive Ops actions.
    }
    const latestAuthentication = Array.isArray(claims.amr)
        ? Math.max(
              ...claims.amr
                  .map(authentication => authentication.timestamp)
                  .filter((timestamp): timestamp is number => typeof timestamp === "number")
          )
        : Number.NaN;
    return {
        id: data.user.id,
        email: data.user.email,
        authenticationAssuranceLevel:
            claims.sub === data.user.id && ["aal1", "aal2"].includes(String(claims.aal))
                ? (claims.aal as "aal1" | "aal2")
                : undefined,
        authenticatedAt:
            claims.sub === data.user.id && Number.isFinite(latestAuthentication)
                ? new Date(latestAuthentication * 1000)
                : undefined,
    };
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
    await assertUserOperationalAccess(request.user.id);
    if (!enforceHttpUserRateLimit(request, response)) return;
    enrichObservabilityContext({ userId: request.user.id });
    request.log = request.log.child({ requestId: request.requestId, userId: request.user.id });
    return next();
}
