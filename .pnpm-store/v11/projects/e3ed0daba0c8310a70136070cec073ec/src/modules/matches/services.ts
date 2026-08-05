import { api } from "@/services/api";
import type { Match, Standing } from "./types";
export const getMatches = async (leagueId: string) => (await api.get<Match[]>(`/leagues/${leagueId}/matches`)).data;
export const getStandings = async (leagueId: string) => (await api.get<Standing[]>(`/leagues/${leagueId}/matches/standings`)).data;
export const getMatch = async (matchId: string) => (await api.get<Match>(`/matches/${matchId}`)).data;
export const voteMatch = async (matchId: string, winner_team: number) => (await api.post<Match>(`/matches/${matchId}/votes`, { winner_team })).data;
export const resolveMatch = async (matchId: string, winner_team: number, reason: string) => (await api.post<Match>(`/matches/${matchId}/resolve`, { winner_team, reason })).data;
