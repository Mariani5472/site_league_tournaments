import { Request, Response } from "express";
import { LobbiesService } from "./lobbies.service";

export class LobbiesController {
  private lobbiesService = new LobbiesService();

  async list(request: Request, response: Response) {
    const league_id = request.params.league_id as string | undefined;
    const user_id = request.user.id;

    const lobby = await this.lobbiesService.list(league_id, user_id);
    return response.json(lobby);
  }

  async show(request: Request, response: Response) {
    const lobby_id = request.params.lobby_id as string | undefined;
    const league_id = request.params.league_id as string | undefined;
    const user_id = request.user.id;

    const lobby = await this.lobbiesService.show(
      user_id,
      lobby_id,
      league_id,
    );
    return response.json(lobby);
  }

  async create(request: Request, response: Response) {
    const league_id = request.params.league_id as string | undefined;
    const user_id = request.user.id;

    const lobby = await this.lobbiesService.create(
      league_id,
      user_id,
      { max_players: request.body.maxPlayers }
    );

    return response
      .status(201)
      .json(lobby);
  }

  async join(request: Request, response: Response) {
    const lobby_id = request.params.lobby_id as string | undefined;
    const user_id = request.user.id;

    const player = await this.lobbiesService.joinLobby(
      lobby_id,
      user_id
    );

    return response
      .json(player);
  }

  async leave(request: Request, response: Response) {
    const lobby_id = request.params.lobby_id as string | undefined;
    const user_id = request.user.id;

    await this.lobbiesService.leaveLobby(
      lobby_id,
      user_id
    );

    return response
      .status(204)
      .send();
  }

  async changeTeam(request: Request, response: Response) {
    const lobby_id = request.params.lobby_id as string | undefined;
    const user_id = request.user.id;
    const { team_number } = request.body

    const player = await this.lobbiesService.changeTeam(
      lobby_id,
      user_id,
      team_number
    );

    return response
      .json(player);
  }

  async ready(request: Request, response: Response) {
    const lobby_id = request.params.lobby_id as string | undefined;
    const user_id = request.user.id;

    const player = await this.lobbiesService.toggleReady(
      lobby_id,
      user_id,
    );

    return response
      .json(player);
  }
}