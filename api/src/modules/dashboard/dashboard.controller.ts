import type { Request, Response } from "express";
import { DashboardService } from "./dashboard.service";

export class DashboardController {
    constructor(private readonly service = new DashboardService()) {}
    async show(request: Request, response: Response) {
        return response.json(await this.service.get(request.user.id));
    }
}
