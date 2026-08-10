import { Request, Response } from "express";
import { LobbiesService } from "./lobbies.service";
import { z } from "zod";
const selectionVoteSchema = z.object({ mode: z.enum(["random", "balanced", "player_picks"]) });
const draftPickSchema = z.object({ userId: z.uuid() });
const confirmationSchema = z.object({ decision: z.enum(["accept", "reroll"]) });
const captainVoteSchema = z.object({ candidateId: z.uuid() });
export class LobbiesController {
    private lobbiesService = new LobbiesService();
    async list(request: Request, response: Response) {
        const leagueId = request.params.leagueId as string | undefined;
        const userId = request.user.id;
        const lobby = await this.lobbiesService.list(leagueId, userId);
        return response.json(lobby);
    }
    async show(request: Request, response: Response) {
        const lobbyId = request.params.lobbyId as string | undefined;
        const leagueId = request.params.leagueId as string | undefined;
        const userId = request.user.id;
        const lobby = await this.lobbiesService.show(userId, lobbyId, leagueId);
        return response.json(lobby);
    }
    async create(request: Request, response: Response) {
        const leagueId = request.params.leagueId as string | undefined;
        const userId = request.user.id;
        const lobby = await this.lobbiesService.create(leagueId, userId, { maxPlayers: request.body.maxPlayers });
        return response
            .status(201)
            .json(lobby);
    }
    async join(request: Request, response: Response) {
        const lobbyId = request.params.lobbyId as string | undefined;
        const userId = request.user.id;
        const player = await this.lobbiesService.joinLobby(lobbyId, userId, request.params.leagueId as string);
        return response
            .json(player);
    }
    async cancel(request: Request, response: Response) {
        const lobbyId = request.params.lobbyId as string | undefined;
        const leagueId = request.params.leagueId as string | undefined;
        const userId = request.user.id;
        await this.lobbiesService.cancel(lobbyId, leagueId, userId);
        return response
            .status(204)
            .send();
    }
    async leave(request: Request, response: Response) {
        const lobbyId = request.params.lobbyId as string | undefined;
        const userId = request.user.id;
        await this.lobbiesService.leaveLobby(lobbyId, userId, request.params.leagueId as string);
        return response
            .status(204)
            .send();
    }
    async changeTeam(request: Request, response: Response) {
        const lobbyId = request.params.lobbyId as string | undefined;
        const userId = request.user.id;
        const { teamNumber } = request.body;
        const player = await this.lobbiesService.changeTeam(lobbyId, userId, request.params.leagueId as string, teamNumber);
        return response
            .json(player);
    }
    async ready(request: Request, response: Response) {
        const lobbyId = request.params.lobbyId as string | undefined;
        const userId = request.user.id;
        const player = await this.lobbiesService.setReady(lobbyId, userId, request.params.leagueId as string);
        return response
            .json(player);
    }
    async unready(request: Request, response: Response) {
        const lobbyId = request.params.lobbyId as string | undefined;
        const userId = request.user.id;
        const player = await this.lobbiesService.setUnready(lobbyId, userId, request.params.leagueId as string);
        return response
            .json(player);
    }
    async start(request: Request, response: Response) {
        const match = await this.lobbiesService.start(request.params.lobbyId as string, request.params.leagueId as string, request.user.id);
        return response.status(201).json(match);
    }
    async voteTeamSelection(request: Request, response: Response) {
        const body = selectionVoteSchema.parse(request.body);
        const lobby = await this.lobbiesService.voteTeamSelection(request.params.lobbyId as string, request.params.leagueId as string, request.user.id, body.mode);
        return response.json(lobby);
    }
    async draftPick(request: Request, response: Response) {
        const body = draftPickSchema.parse(request.body);
        const lobby = await this.lobbiesService.draftPick(request.params.lobbyId as string, request.params.leagueId as string, request.user.id, body.userId);
        return response.json(lobby);
    }
    async confirmTeamSelection(request: Request, response: Response) {
        const body = confirmationSchema.parse(request.body);
        return response.json(await this.lobbiesService.confirmRandomTeams(request.params.lobbyId as string, request.params.leagueId as string, request.user.id, body.decision));
    }
    async voteCaptain(request: Request, response: Response) {
        const body = captainVoteSchema.parse(request.body);
        return response.json(await this.lobbiesService.voteCaptain(request.params.lobbyId as string, request.params.leagueId as string, request.user.id, body.candidateId));
    }
    async finalizeCaptains(request: Request, response: Response) {
        return response.json(await this.lobbiesService.finalizeCaptains(request.params.lobbyId as string, request.params.leagueId as string, request.user.id));
    }
}
