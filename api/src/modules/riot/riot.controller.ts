import { Request, Response } from "express";
import { RiotService } from "./riot.service";

export class RiotController {
  private riotService = new RiotService();

  async configuration(_request: Request, response: Response) {
    return response.json(this.riotService.configuration());
  }

  async show(request: Request, response: Response) {
    const userId = request.user.id;
    const account = await this.riotService.getMyAccount(userId);

    return response.json(account);
  }

  async create(request: Request, response: Response) {
    const { gameName, tagLine } = request.body;
    const userId = request.user.id;

    const riotAccount = await this.riotService.linkAccount({
      userId,
      gameName,
      tagLine
    });

    return response
      .status(201)
      .json(riotAccount);
  }

  async remove(request: Request, response: Response) {
    await this.riotService.unlinkAccount(request.user.id);

    return response
      .status(204)
      .send();
  }
}
