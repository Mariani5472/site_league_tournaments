import { api } from "@/services/api";
import type { Match, Standing } from "./types";
export const getMatches = async (leagueId: string) => (await api.get<Match[]>(`/leagues/${leagueId}/matches`)).data;
export const getStandings = async (leagueId: string) => (await api.get<Standing[]>(`/leagues/${leagueId}/matches/standings`)).data;
export const getMatch = async (matchId: string) => (await api.get<Match>(`/matches/${matchId}`)).data;
export const voteMatch = async (matchId: string, winnerTeam: number) => (await api.post<Match>(`/matches/${matchId}/votes`, { winnerTeam })).data;
export const resolveMatch = async (matchId: string, winnerTeam: number, reason: string) => (await api.post<Match>(`/matches/${matchId}/resolve`, { winnerTeam, reason })).data;
