import { Router } from "express";
import { LeagueJoinRequestsController } from "./league-join-requests.controller";

const leagueJoinRequestsRoutes = Router();
const leagueJoinRequestsController = new LeagueJoinRequestsController();