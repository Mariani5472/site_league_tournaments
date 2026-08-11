import type { QueryClient } from "@tanstack/react-query";
import type { RealtimeSession, SocketSessionOwner } from "./socket";

export class SessionLifecycle {
    private userId: string | null | undefined;
    private generation = 0;
    private readonly queryClient: Pick<QueryClient, "cancelQueries" | "clear">;
    private readonly socketOwner: Pick<SocketSessionOwner, "apply">;

    constructor(
        queryClient: Pick<QueryClient, "cancelQueries" | "clear">,
        socketOwner: Pick<SocketSessionOwner, "apply">
    ) {
        this.queryClient = queryClient;
        this.socketOwner = socketOwner;
    }

    async transition(session: RealtimeSession | null) {
        const generation = ++this.generation;
        const nextUserId = session?.user.id ?? null;
        const identityChanged = this.userId !== undefined && this.userId !== nextUserId;

        this.userId = nextUserId;
        if (identityChanged) {
            this.socketOwner.apply(null);
            await this.queryClient.cancelQueries();
            this.queryClient.clear();
        }

        if (generation === this.generation) {
            this.socketOwner.apply(session);
        }
    }

    async dispose() {
        ++this.generation;
        this.userId = null;
        this.socketOwner.apply(null);
        await this.queryClient.cancelQueries();
        this.queryClient.clear();
    }
}
