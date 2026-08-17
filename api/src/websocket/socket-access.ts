import { Socket } from "socket.io";
import { getIO } from "./socket";

type SocketGrants = {
    userId: string;
    leagues: Set<string>;
    lobbies: Map<string, string>;
};

const userSockets = new Map<string, Set<string>>();
const grantsBySocket = new Map<string, SocketGrants>();

export class SocketAccess {
    static register(socket: Socket) {
        const userId = socket.data.user.id as string;
        const socketIds = userSockets.get(userId) ?? new Set<string>();

        socketIds.add(socket.id);
        userSockets.set(userId, socketIds);
        grantsBySocket.set(socket.id, {
            userId,
            leagues: new Set(),
            lobbies: new Map()
        });

        socket.once("disconnect", () => this.unregister(socket.id));
    }

    static async joinLeague(socket: Socket, leagueId: string) {
        await socket.join(`league:${leagueId}`);
        grantsBySocket.get(socket.id)?.leagues.add(leagueId);
    }

    static async grantMembership(userId: string, leagueId: string) {
        const socketIds = [...(userSockets.get(userId) ?? [])];
        await Promise.all(
            socketIds.map(async socketId => {
                const socket = getIO().sockets.sockets.get(socketId);
                if (!socket) return;
                await this.joinLeague(socket, leagueId);
            })
        );
    }

    static async leaveLeague(socket: Socket, leagueId: string) {
        await socket.leave(`league:${leagueId}`);
        grantsBySocket.get(socket.id)?.leagues.delete(leagueId);
    }

    static async joinLobby(socket: Socket, lobbyId: string, leagueId: string) {
        await socket.join(`lobby:${lobbyId}`);
        grantsBySocket.get(socket.id)?.lobbies.set(lobbyId, leagueId);
    }

    static async leaveLobby(socket: Socket, lobbyId: string) {
        await socket.leave(`lobby:${lobbyId}`);
        grantsBySocket.get(socket.id)?.lobbies.delete(lobbyId);
    }

    static async revokeMembership(userId: string, leagueId: string) {
        const socketIds = [...(userSockets.get(userId) ?? [])];
        await Promise.all(socketIds.map(socketId => this.revokeSocketLeague(socketId, leagueId)));
    }

    static async revokeLeague(leagueId: string) {
        const socketIds = [...grantsBySocket.keys()];
        await Promise.all(socketIds.map(socketId => this.revokeSocketLeague(socketId, leagueId)));
    }

    private static async revokeSocketLeague(socketId: string, leagueId: string) {
        const grants = grantsBySocket.get(socketId);
        const socket = getIO().sockets.sockets.get(socketId);

        if (!grants || !socket) {
            return;
        }

        await socket.leave(`league:${leagueId}`);
        grants.leagues.delete(leagueId);

        const lobbyIds = [...grants.lobbies.entries()]
            .filter(([, lobbyLeagueId]) => lobbyLeagueId === leagueId)
            .map(([lobbyId]) => lobbyId);

        await Promise.all(lobbyIds.map(lobbyId => socket.leave(`lobby:${lobbyId}`)));
        lobbyIds.forEach(lobbyId => grants.lobbies.delete(lobbyId));
    }

    private static unregister(socketId: string) {
        const grants = grantsBySocket.get(socketId);
        if (!grants) {
            return;
        }

        grantsBySocket.delete(socketId);
        const socketIds = userSockets.get(grants.userId);
        socketIds?.delete(socketId);

        if (!socketIds?.size) {
            userSockets.delete(grants.userId);
        }
    }
}
