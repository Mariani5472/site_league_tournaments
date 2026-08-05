import { Request, Response } from "express";
import { LobbiesService } from "./lobbies.service";
import { z } from "zod";

const selectionVoteSchema = z.object({ mode: z.enum(["random", "balanced", "player_picks"]) });
const draftPickSchema = z.object({ user_id: z.uuid() });
const confirmationSchema = z.object({ decision: z.enum(["accept", "reroll"]) });
const captainVoteSchema = z.object({ candidate_id: z.uuid() });

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
      user_id,
      request.params.league_id as string
    );

    return response
      .json(player);
  }

  async cancel(request: Request, response: Response) {
    const lobby_id = request.params.lobby_id as string | undefined;
    const league_id = request.params.league_id as string | undefined;
    const user_id = request.user.id;

    await this.lobbiesService.cancel(
      lobby_id,
      league_id,
      user_id
    );

    return response
      .status(204)
      .send();
  }

  async leave(request: Request, response: Response) {
    const lobby_id = request.params.lobby_id as string | undefined;
    const user_id = request.user.id;

    await this.lobbiesService.leaveLobby(
      lobby_id,
      user_id,
      request.params.league_id as string
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
      request.params.league_id as string,
      team_number
    );

    return response
      .json(player);
  }

  async ready(request: Request, response: Response) {
    const lobby_id = request.params.lobby_id as string | undefined;
    const user_id = request.user.id;

    const player = await this.lobbiesService.setReady(
      lobby_id,
      user_id,
      request.params.league_id as string,
    );

    return response
      .json(player);
  }

  async unready(request: Request, response: Response) {
    const lobby_id = request.params.lobby_id as string | undefined;
    const user_id = request.user.id;

    const player = await this.lobbiesService.setUnready(
      lobby_id,
      user_id,
      request.params.league_id as string,
    );

    return response
      .json(player);
  }

  async start(request: Request, response: Response) {
    const match = await this.lobbiesService.start(
      request.params.lobby_id as string,
      request.params.league_id as string,
      request.user.id
    );
    return response.status(201).json(match);
  }

  async voteTeamSelection(request: Request, response: Response) {
    const body = selectionVoteSchema.parse(request.body);
    const lobby = await this.lobbiesService.voteTeamSelection(request.params.lobby_id as string, request.params.league_id as string, request.user.id, body.mode);
    return response.json(lobby);
  }

  async draftPick(request: Request, response: Response) {
    const body = draftPickSchema.parse(request.body);
    const lobby = await this.lobbiesService.draftPick(request.params.lobby_id as string, request.params.league_id as string, request.user.id, body.user_id);
    return response.json(lobby);
  }

  async confirmTeamSelection(request: Request, response: Response) {
    const body = confirmationSchema.parse(request.body);
    return response.json(await this.lobbiesService.confirmRandomTeams(request.params.lobby_id as string, request.params.league_id as string, request.user.id, body.decision));
  }

  async voteCaptain(request: Request, response: Response) {
    const body = captainVoteSchema.parse(request.body);
    return response.json(await this.lobbiesService.voteCaptain(request.params.lobby_id as string, request.params.league_id as string, request.user.id, body.candidate_id));
  }

  async finalizeCaptains(request: Request, response: Response) {
    return response.json(await this.lobbiesService.finalizeCaptains(request.params.lobby_id as string, request.params.league_id as string, request.user.id));
  }
}
