import { Socket } from "socket.io";
import { supabase } from "../lib/supabase";
import { UserIdentity } from "../modules/users/users.types";
import { assertUserOperationalAccess } from "../security/user-operational-access";

export type SocketAuthenticator = (token: string) => Promise<UserIdentity>;

const authenticateWithSupabase: SocketAuthenticator = async token => {
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user) {
        throw new Error("Invalid token");
    }
    return {
        id: data.user.id,
        email: data.user.email ?? ""
    };
};

export function createSocketAuthMiddleware(
    authenticate: SocketAuthenticator = authenticateWithSupabase,
    authorize: (userId: string) => Promise<void> = assertUserOperationalAccess
) {
    return async (socket: Socket, next: (err?: Error) => void) => {
    try {
        const token = socket.handshake.auth.token;
        if (!token) {
            return next(new Error("Token missing"));
        }
        socket.data.user = await authenticate(token);
        await authorize(socket.data.user.id);
        next();
    }
    catch {
        next(new Error("Authentication failed"));
    }
    };
}

export const socketAuthMiddleware = createSocketAuthMiddleware();
