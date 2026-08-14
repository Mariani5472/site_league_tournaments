import { Socket } from "socket.io";
import { supabase } from "../lib/supabase";
import { UserIdentity } from "../modules/users/users.types";

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

export function createSocketAuthMiddleware(authenticate: SocketAuthenticator = authenticateWithSupabase) {
    return async (socket: Socket, next: (err?: Error) => void) => {
    try {
        const token = socket.handshake.auth.token;
        if (!token) {
            return next(new Error("Token missing"));
        }
        socket.data.user = await authenticate(token);
        next();
    }
    catch {
        next(new Error("Authentication failed"));
    }
    };
}

export const socketAuthMiddleware = createSocketAuthMiddleware();
