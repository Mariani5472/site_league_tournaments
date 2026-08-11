import { getAccessToken } from "@/lib/supabase/session";
import type { Session } from "@supabase/supabase-js";
import { io } from "socket.io-client";
export const socket = io(import.meta.env.VITE_API_URL, {
    autoConnect: false,
});

export type RealtimeSession = Pick<Session, "access_token" | "user">;
type ManagedSocket = Pick<typeof socket, "auth" | "connected" | "connect" | "disconnect">;

export class SocketSessionOwner {
    private userId: string | null = null;
    private token: string | undefined;
    private readonly client: ManagedSocket;

    constructor(client: ManagedSocket = socket) {
        this.client = client;
    }

    apply(session: RealtimeSession | null) {
        const nextUserId = session?.user.id ?? null;
        const nextToken = getAccessToken(session);
        const credentialsChanged = this.userId !== nextUserId || this.token !== nextToken;

        if (credentialsChanged && this.client.connected) {
            this.client.disconnect();
        }

        this.userId = nextUserId;
        this.token = nextToken;
        this.client.auth = nextToken ? { token: nextToken } : {};

        if (session && !this.client.connected) {
            this.client.connect();
        }
        if (!session && this.client.connected) {
            this.client.disconnect();
        }
    }
}

export const socketSessionOwner = new SocketSessionOwner();
