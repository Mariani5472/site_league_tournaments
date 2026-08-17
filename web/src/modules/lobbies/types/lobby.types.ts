export type LobbyStatus = "waiting" | "in_game" | "finished" | "cancelled";
export interface Lobby {
    id: string;
    status: LobbyStatus;
    maxPlayers: number;
    playersCount: number;
    availableSlots: number;
    isFull: boolean;
    canJoin: boolean;
}
export interface LobbyDetails {
    id: string;
    leagueId: string;
    matchId: string | null;
    status: LobbyStatus;
    maxPlayers: number;
    playersCount: number;
    readyCount: number;
    availableSlots: number;
    isFull: boolean;
    isBalanced: boolean;
    everyoneReady: boolean;
    canStart: boolean;
    currentPlayer: LobbyCurrentPlayer | null;
    players: LobbyPlayer[];
    teams: LobbyTeams;
    teamSelection: TeamSelection | null;
}
export type TeamSelectionMode = "random" | "balanced" | "player_picks";
export interface TeamSelection {
    available: boolean;
    canVote: boolean;
    mode: TeamSelectionMode | null;
    completed: boolean;
    majorityRequired: number;
    myVote: TeamSelectionMode | null;
    votes: Record<TeamSelectionMode, number>;
    round: number;
    confirmation: null | {
        myVote: "accept" | "reroll" | null;
        votes: Record<"accept" | "reroll", number>;
    };
    captainVote: null | {
        endsAt: string;
        myVote: string | null;
        candidates: Array<
            Pick<LobbyPlayer, "userId" | "nickname" | "avatarUrl"> & {
                votes: number;
            }
        >;
    };
    draft: null | {
        captain1: string;
        captain2: string;
        nextTeam: 1 | 2 | null;
        pickIndex: number;
        picks: Array<
            LobbyPlayer & {
                pickNumber: number;
            }
        >;
        availablePlayers: LobbyPlayer[];
    };
}
export interface LobbyCurrentPlayer {
    userId: string;
    teamNumber: 1 | 2;
    isReady: boolean;
}
export interface LobbyTeams {
    team1: LobbyTeam;
    team2: LobbyTeam;
}
export interface LobbyTeam {
    count: number;
    players: LobbyPlayer[];
}
export interface LobbyPlayer {
    userId: string;
    nickname: string;
    avatarUrl: string | null;
    teamNumber: 1 | 2;
    isReady: boolean;
}
