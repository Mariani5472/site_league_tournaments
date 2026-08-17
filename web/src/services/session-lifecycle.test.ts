import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";
import type { RealtimeSession } from "./socket";
import { SocketSessionOwner } from "./socket";
import { SessionLifecycle } from "./session-lifecycle";

function session(userId: string, token = `token-${userId}`) {
    return {
        access_token: token,
        user: { id: userId },
    } as RealtimeSession;
}

describe("SessionLifecycle", () => {
    it("disconnects and clears private cache on logout", async () => {
        const queryClient = new QueryClient();
        const socketOwner = { apply: vi.fn() };
        const lifecycle = new SessionLifecycle(queryClient, socketOwner);

        await lifecycle.transition(session("user-a"));
        queryClient.setQueryData(["profile", "me"], { nickname: "Previous user" });
        await lifecycle.transition(null);

        expect(queryClient.getQueryData(["profile", "me"])).toBeUndefined();
        expect(socketOwner.apply).toHaveBeenNthCalledWith(2, null);
        expect(socketOwner.apply).toHaveBeenLastCalledWith(null);
    });

    it("isolates an account switch before connecting the next user", async () => {
        const queryClient = new QueryClient();
        const socketOwner = { apply: vi.fn() };
        const lifecycle = new SessionLifecycle(queryClient, socketOwner);

        await lifecycle.transition(session("user-a"));
        queryClient.setQueryData(["leagues", "mine"], [{ id: "private-a" }]);
        await lifecycle.transition(session("user-b"));

        expect(queryClient.getQueryData(["leagues", "mine"])).toBeUndefined();
        expect(socketOwner.apply).toHaveBeenNthCalledWith(2, null);
        expect(socketOwner.apply).toHaveBeenLastCalledWith(session("user-b"));
    });
});

describe("SocketSessionOwner", () => {
    it("reconnects with current credentials and rotates credentials safely", () => {
        const client = {
            auth: {} as Record<string, string>,
            connected: false,
            connect: vi.fn(function (this: typeof client) {
                this.connected = true;
            }),
            disconnect: vi.fn(function (this: typeof client) {
                this.connected = false;
            }),
        };
        const owner = new SocketSessionOwner(client as never);

        owner.apply(session("user-a"));
        client.connected = false;
        owner.apply(session("user-a"));
        owner.apply(session("user-b"));
        owner.apply(null);

        expect(client.connect).toHaveBeenCalledTimes(3);
        expect(client.disconnect).toHaveBeenCalledTimes(2);
        expect(client.auth).toEqual({});
        expect(client.connected).toBe(false);
    });
});
