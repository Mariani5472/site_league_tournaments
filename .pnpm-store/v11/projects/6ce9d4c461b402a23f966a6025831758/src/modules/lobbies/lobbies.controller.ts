import { Request, Response } from "express";
import { LobbiesService } from "./lobbies.service";
import {
    captainVoteBodySchema,
    changeLobbyTeamBodySchema,
    createLobbyBodySchema,
    draftPickBodySchema,
    leagueLobbiesParamsSchema,
    lobbyParamsSchema,
    teamSelectionConfirmationBodySchema,
    teamSelectionVoteBodySchema,
} from "./lobbies.schemas";

export class LobbiesController {
    private readonly lobbiesService = new LobbiesService();

    async list(request: Request, response: Response) {
        const { leagueId } = leagueLobbiesParamsSchema.parse(request.params);
        const lobbies = await this.lobbiesService.list(leagueId, request.user.id);
        return response.json(lobbies);
    }

    async show(request: Request, response: Response) {
        const { leagueId, lobbyId } = lobbyParamsSchema.parse(request.params);
        const lobby = await this.lobbiesService.show(request.user.id, lobbyId, leagueId);
        return response.json(lobby);
    }

    async create(request: Request, response: Response) {
        const { leagueId } = leagueLobbiesParamsSchema.parse(request.params);
        const body = createLobbyBodySchema.parse(request.body);
        const lobby = await this.lobbiesService.create(leagueId, request.user.id, body);
        return response.status(201).json(lobby);
    }

    async join(request: Request, response: Response) {
        const { leagueId, lobbyId } = lobbyParamsSchema.parse(request.params);
        const player = await this.lobbiesService.joinLobby(lobbyId, request.user.id, leagueId);
        return response.json(player);
    }

    async cancel(request: Request, response: Response) {
        const { leagueId, lobbyId } = lobbyParamsSchema.parse(request.params);
        await this.lobbiesService.cancel(lobbyId, leagueId, request.user.id);
        return response.status(204).send();
    }

    async leave(request: Request, response: Response) {
        const { leagueId, lobbyId } = lobbyParamsSchema.parse(request.params);
        await this.lobbiesService.leaveLobby(lobbyId, request.user.id, leagueId);
        return response.status(204).send();
    }

    async changeTeam(request: Request, response: Response) {
        const { leagueId, lobbyId } = lobbyParamsSchema.parse(request.params);
        const body = changeLobbyTeamBodySchema.parse(request.body);
        const player = await this.lobbiesService.changeTeam(lobbyId, request.user.id, leagueId, body.teamNumber);
        return response.json(player);
    }

    async ready(request: Request, response: Response) {
        const { leagueId, lobbyId } = lobbyParamsSchema.parse(request.params);
        const player = await this.lobbiesService.setReady(lobbyId, request.user.id, leagueId);
        return response.json(player);
    }

    async unready(request: Request, response: Response) {
        const { leagueId, lobbyId } = lobbyParamsSchema.parse(request.params);
        const player = await this.lobbiesService.setUnready(lobbyId, request.user.id, leagueId);
        return response.json(player);
    }

    async start(request: Request, response: Response) {
        const { leagueId, lobbyId } = lobbyParamsSchema.parse(request.params);
        const match = await this.lobbiesService.start(lobbyId, leagueId, request.user.id);
        return response.status(201).json(match);
    }

    async voteTeamSelection(request: Request, response: Response) {
        const { leagueId, lobbyId } = lobbyParamsSchema.parse(request.params);
        const body = teamSelectionVoteBodySchema.parse(request.body);
        const lobby = await this.lobbiesService.voteTeamSelection(lobbyId, leagueId, request.user.id, body.mode);
        return response.json(lobby);
    }

    async confirmTeamSelection(request: Request, response: Response) {
        const { leagueId, lobbyId } = lobbyParamsSchema.parse(request.params);
        const body = teamSelectionConfirmationBodySchema.parse(request.body);
        const lobby = await this.lobbiesService.confirmRandomTeams(lobbyId, leagueId, request.user.id, body.decision);
        return response.json(lobby);
    }

    async voteCaptain(request: Request, response: Response) {
        const { leagueId, lobbyId } = lobbyParamsSchema.parse(request.params);
        const body = captainVoteBodySchema.parse(request.body);
        const lobby = await this.lobbiesService.voteCaptain(lobbyId, leagueId, request.user.id, body.candidateId);
        return response.json(lobby);
    }

    async finalizeCaptains(request: Request, response: Response) {
        const { leagueId, lobbyId } = lobbyParamsSchema.parse(request.params);
        const lobby = await this.lobbiesService.finalizeCaptains(lobbyId, leagueId, request.user.id);
        return response.json(lobby);
    }

    async draftPick(request: Request, response: Response) {
        const { leagueId, lobbyId } = lobbyParamsSchema.parse(request.params);
        const body = draftPickBodySchema.parse(request.body);
        const lobby = await this.lobbiesService.draftPick(lobbyId, leagueId, request.user.id, body.userId);
        return response.json(lobby);
    }
}
