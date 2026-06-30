import { Request, Response } from "express";
import { LobbiesService } from "./lobbies.service";

export class LobbiesController {
  private lobbiesService = new LobbiesService();

  async create(request: Request, response: Response) {
    const lobby = await this.lobbiesService.createLobby({
      creatorId: request.user.id,
      leagueId: request.body.leagueId,
      maxPlayers: request.body.maxPlayers
    });

    return response
      .status(201)
      .json(lobby);
  }

  async join(request: Request, response: Response) {
    const player = await this.lobbiesService.joinLobby({
      lobbyId: request.params.lobbyId as string,
      userId: request.user.id
    });

    return response
      .json(player);
  }

  async leave(request: Request, response: Response) {
    await this.lobbiesService.leaveLobby({
      lobbyId: request.params.lobbyId as string,
      userId: request.user.id
    });

    return response
      .status(204)
      .send();
  }

  async changeTeam(request: Request, response: Response) {
    const player = await this.lobbiesService.changeTeam({
      lobbyId: request.params.lobbyId as string,
      userId: request.user.id,
      teamNumber: request.body.teamNumber
    });

    return response
      .json(player);
  }

  async ready(request: Request, response: Response) {
    const player = await this.lobbiesService.toggleReady({
      lobbyId: request.params.lobbyId as string,
      userId: request.user.id
    });

    return response
      .json(player);
  }

  async getLobby(request: Request, response: Response) {
    const lobby = await this.lobbiesService.getLobby(request.params.lobbyId as string);
    return response.json(lobby);
  }
}